import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountJson) {
    console.error('缺少環境變數 FIREBASE_SERVICE_ACCOUNT，無法連線 Firebase');
    process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountJson);

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();
const now = Timestamp.now();

// Firestore 單一 batch 最多 500 筆寫入
const BATCH_LIMIT = 450;

async function main() {
    const [publishSnap, unpublishSnap] = await Promise.all([
        db.collection('products').where('scheduledPublishAt', '<=', now).get(),
        db.collection('products').where('scheduledUnpublishAt', '<=', now).get()
    ]);

    // 同一個商品的上架、下架時間可能都已經到了（GitHub Actions 的排程是 best-effort，
    // 實際常常隔好幾個小時才跑一次）。以前固定先處理全部上架、再處理下架，
    // 管理員設「12:00 下架、14:00 重新上架」，15:00 跑到時商品會被留在下架。
    // 改成兩個時間都到期時，以「比較晚」的那個為準，兩個欄位都清掉
    const plans = new Map(); // id -> { ref, publishAt, unpublishAt }
    publishSnap.docs.forEach(doc => {
        plans.set(doc.id, { ref: doc.ref, publishAt: doc.get('scheduledPublishAt'), unpublishAt: null });
    });
    unpublishSnap.docs.forEach(doc => {
        const plan = plans.get(doc.id) || { ref: doc.ref, publishAt: null, unpublishAt: null };
        plan.unpublishAt = doc.get('scheduledUnpublishAt');
        plans.set(doc.id, plan);
    });

    if (plans.size === 0) {
        console.log('沒有到期的排程');
        return;
    }

    let publishedCount = 0;
    let unpublishedCount = 0;
    let batch = db.batch();
    let pending = 0;

    for (const [id, plan] of plans) {
        const update = {};
        let newStatus;
        if (plan.publishAt && plan.unpublishAt) {
            newStatus = plan.publishAt.toMillis() >= plan.unpublishAt.toMillis() ? 'active' : 'inactive';
            update.scheduledPublishAt = FieldValue.delete();
            update.scheduledUnpublishAt = FieldValue.delete();
        } else if (plan.publishAt) {
            newStatus = 'active';
            update.scheduledPublishAt = FieldValue.delete();
        } else {
            newStatus = 'inactive';
            update.scheduledUnpublishAt = FieldValue.delete();
        }
        update.status = newStatus;
        if (newStatus === 'active') publishedCount++; else unpublishedCount++;

        batch.update(plan.ref, update);
        console.log(`${id} -> status: ${newStatus}`);
        pending++;

        if (pending >= BATCH_LIMIT) {
            await batch.commit();
            batch = db.batch();
            pending = 0;
        }
    }
    if (pending > 0) await batch.commit();

    console.log(`完成：上架 ${publishedCount} 項，下架 ${unpublishedCount} 項`);
}

main().catch(error => {
    console.error('排程執行失敗:', error);
    process.exit(1);
});
