import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountJson) {
    console.error('缺少環境變數 FIREBASE_SERVICE_ACCOUNT，無法連線 Firebase');
    process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountJson);

initializeApp({
    credential: cert(serviceAccount)
});

const auth = getAuth();
const db = getFirestore();

function detectProvider(userRecord) {
    const providerId = userRecord.providerData[0]?.providerId || '';
    if (providerId.includes('facebook')) return 'facebook';
    if (providerId.includes('google')) return 'google';
    if (userRecord.phoneNumber) return 'phone';
    return providerId || 'unknown';
}

function normalizedPhone(phoneNumber) {
    if (!phoneNumber) return '';
    return phoneNumber.replace(/^\+886/, '0');
}

// Authentication 的 creationTime / lastSignInTime 是權威時間來源，
// 不會受網站前端的寫入競爭（例如 profile.html 跟 member.js 同時寫 Firestore）影響
function getAuthTimes(userRecord) {
    const creationTime = userRecord.metadata?.creationTime
        ? Timestamp.fromDate(new Date(userRecord.metadata.creationTime))
        : Timestamp.now();
    const lastSignInTime = userRecord.metadata?.lastSignInTime
        ? Timestamp.fromDate(new Date(userRecord.metadata.lastSignInTime))
        : creationTime;
    return { creationTime, lastSignInTime };
}

function toMillis(value) {
    if (!value) return null;
    if (typeof value.toMillis === 'function') return value.toMillis();
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed.getTime();
}

async function listAllAuthUsers() {
    const users = [];
    let pageToken;
    do {
        const result = await auth.listUsers(1000, pageToken);
        users.push(...result.users);
        pageToken = result.pageToken;
    } while (pageToken);
    return users;
}

// 只補齊 Firestore 裡目前是空白的欄位，絕不覆蓋既有值，
// 避免蓋掉使用者自己在會員資料頁面編輯過的姓名等資料
async function main() {
    const authUsers = await listAllAuthUsers();
    console.log(`Firebase Authentication 共有 ${authUsers.length} 個帳號`);

    let created = 0;
    let backfilled = 0;
    const authUidSet = new Set(authUsers.map(u => u.uid));

    for (const userRecord of authUsers) {
        const userRef = db.collection('users').doc(userRecord.uid);
        const userSnap = await userRef.get();
        const email = userRecord.email || '';
        const phone = normalizedPhone(userRecord.phoneNumber);
        const name = userRecord.displayName || '';

        if (!userSnap.exists) {
            const { creationTime, lastSignInTime } = getAuthTimes(userRecord);
            await userRef.set({
                email,
                phone,
                name,
                photoURL: userRecord.photoURL || '',
                provider: detectProvider(userRecord),
                createdAt: creationTime,
                lastLoginAt: lastSignInTime,
                city: '',
                district: '',
                address: ''
            });
            created++;
            console.log(`建立缺少的會員資料: ${userRecord.uid}`);
            continue;
        }

        const data = userSnap.data();
        const patch = {};
        if (!data.email && email) patch.email = email;
        if (!data.phone && phone) patch.phone = phone;
        if (!data.name && name) patch.name = name;

        // 註冊時間比最後登入時間還晚，邏輯上不可能發生
        // （通常是 profile.html 跟 member.js 同時搶寫 Firestore 造成的），
        // 用 Authentication 的權威時間校正回去
        const createdMs = toMillis(data.createdAt);
        const lastLoginMs = toMillis(data.lastLoginAt);
        let timeFixed = false;
        if (createdMs !== null && lastLoginMs !== null && createdMs > lastLoginMs) {
            const { creationTime, lastSignInTime } = getAuthTimes(userRecord);
            patch.createdAt = creationTime;
            patch.lastLoginAt = lastSignInTime;
            timeFixed = true;
        }

        if (Object.keys(patch).length > 0) {
            await userRef.update(patch);
            backfilled++;
            if (timeFixed) {
                console.log(`修正時間顛倒 ${userRecord.uid}:`, patch);
            } else {
                console.log(`補齊會員資料 ${userRecord.uid}:`, patch);
            }
        }
    }

    // 找出 Firestore 裡有、但 Authentication 已經沒有對應帳號的孤兒紀錄，只記錄不自動刪除
    const usersSnapshot = await db.collection('users').get();
    const orphans = usersSnapshot.docs.filter(doc => !authUidSet.has(doc.id));
    if (orphans.length > 0) {
        console.log(`發現 ${orphans.length} 筆孤兒會員資料（Authentication 已無對應帳號，未自動刪除）:`);
        orphans.forEach(doc => console.log(` - ${doc.id}`));
    }

    console.log(`完成：新建 ${created} 筆，補齊 ${backfilled} 筆，孤兒 ${orphans.length} 筆`);
}

main().catch(error => {
    console.error('會員資料校正失敗:', error);
    process.exit(1);
});
