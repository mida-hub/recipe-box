// FCM Service Worker configuration using modern Firebase SDK paths

// Firebase SDKの最新安定版 (v11.6.1 を使用) をインポート
// FCMの機能にアクセスするには、サービスワーカーでこれらのスクリプトを読み込む必要があります。
importScripts("https://www.gstatic.com/firebasejs/11.6.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging-compat.js");

// Web AppのFirebase設定
const firebaseConfig = {
  apiKey: "AIzaSyBEyPXsB73Q4haegSgT7d7nOxuv4WlkUmE",
  authDomain: "recipe-box-474414.firebaseapp.com",
  projectId: "recipe-box-474414",
  storageBucket: "recipe-box-474414.firebasestorage.app",
  messagingSenderId: "660500024721",
  appId: "1:660500024721:web:68a11da8c5afcad411de30",
  measurementId: "G-1PGLSTETB4"
};

// Firebaseの初期化
firebase.initializeApp(firebaseConfig);

// Firebase Messaging のインスタンスを取得
const messaging = firebase.messaging();



/**
 * ユーザーが通知をクリックしたときのイベントリスナーを追加
 * ユーザーがアプリのウィンドウを開くか、既に開いているウィンドウにフォーカスを当てる処理を行います。
 */
self.addEventListener('notificationclick', (event) => {
  // 通知を閉じる
  event.notification.close();

  // 通知ペイロードのclick_actionまたはデフォルトURLを取得
  // click_actionは、バックエンドから送信されるプッシュ通知のカスタムフィールドに含めることができます。
  const clickAction = event.notification.data?.FCM_MSG?.notification?.click_action || '/';

  event.waitUntil(
    // 既存のウィンドウでclickActionのURLを探す
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true, // 制御されていないウィンドウも含める
    }).then((clientList) => {
      for (const client of clientList) {
        // 同じオリジンかつURLが一致するウィンドウがあれば、そこにフォーカスする
        if (client.url === clickAction && 'focus' in client) {
          return client.focus();
        }
      }
      // 一致するウィンドウがない場合、新しいタブまたはウィンドウを開く
      if (self.clients.openWindow) {
        return self.clients.openWindow(clickAction);
      }
    })
  );
});


console.log('[firebase-messaging-sw.js] Service Worker Initialized.');
