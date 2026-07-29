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

async function processField(field, newStatus) {
    const snapshot = await db.collection('products')
        .where(field, '<=', now)
        .get();

    if (snapshot.empty) {
        console.log(`[${field}] 沒有到期的商品`);
        return 0;
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
            status: newStatus,
            [field]: FieldValue.delete()
        });
        console.log(`[${field}] ${doc.id} -> status: ${newStatus}`);
    });
    await batch.commit();
    return snapshot.size;
}

async function main() {
    const publishedCount = await processField('scheduledPublishAt', 'active');
    const unpublishedCount = await processField('scheduledUnpublishAt', 'inactive');
    console.log(`完成：上架 ${publishedCount} 項，下架 ${unpublishedCount} 項`);
}

main().catch(error => {
    console.error('排程執行失敗:', error);
    process.exit(1);
});
