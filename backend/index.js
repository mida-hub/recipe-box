// index.js
const express = require('express');
const app = express();
const cors = require('cors');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getStorage } = require('firebase-admin/storage'); // Import getStorage
const multer = require('multer'); // Import multer
const { v4: uuidv4 } = require('uuid'); // Import uuid for unique filenames

// Firebase Admin SDKの初期化
const projectId = process.env.GOOGLE_CLOUD_PROJECT;
console.log("GOOGLE_CLOUD_PROJECT:", projectId);
if (!projectId) {
    // 開発環境でprojectIdが見つからない場合に備えてエラーログを出力
    console.error("GOOGLE_CLOUD_PROJECT environment variable is not set. Using default initialization.");
}

initializeApp({
  projectId: projectId,
  storageBucket: 'recipe-box-474414.firebasestorage.app',
});

const db = getFirestore();
const auth = getAuth();
const recipesCollection = db.collection('recipes');
const bucket = getStorage().bucket(); // Initialize Firebase Storage bucket

// Multer設定
const upload = multer({
  storage: multer.memoryStorage(), // Store files in memory
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// CORSミドルウェアを追加して、フロントエンドからのリクエストを許可
const allowedOrigins = [
  'https://recipe-box-474414.web.app',
  'https://recipe-box-474414.firebaseapp.com', // Firebase Hosting default domain
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'https://recipe-box-backend-rprludoc2q-an.a.run.app', // Cloud Run URL
];
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`CORS policy: Origin ${origin} not allowed`);
      callback(new Error('Not allowed by CORS'));
    }
  },
};
app.use(cors(corsOptions));
app.use(express.json()); // JSONボディをパースするためのミドルウェア

// 認証ミドルウェア
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).send('Unauthorized');
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error while verifying ID token:', error);
    res.status(403).send('Unauthorized');
  }
};

app.get('/', (req, res) => {
  res.send('Hello from the backend!');
});

// APIルーターの作成
const apiRouter = express.Router();

// /recipes ルート以下に認証ミドルウェアを適用
apiRouter.use('/recipes', authMiddleware);

// レシピ一覧取得
apiRouter.get('/recipes', async (req, res) => {
  const { uid } = req.user;
  try {
    const snapshot = await recipesCollection.get();
    const recipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(recipes);
  } catch (error) {
    console.error(`Error getting recipes for user ${uid}:`, error);
    res.status(500).send('Error getting recipes');
  }
});

// レシピ作成
apiRouter.post('/recipes', async (req, res) => {
  const { uid } = req.user;
  try {
    const newRecipe = {
      title: req.body.title,
      isFavorite: req.body.isFavorite || false,
      notes: req.body.notes || '',
      link: req.body.link || '',
      ingredients: req.body.ingredients || [],
      steps: req.body.steps || [],
      userId: uid, // 認証済みのユーザーIDを使用
    };
    const docRef = await recipesCollection.add(newRecipe);
    res.status(201).json({ id: docRef.id, ...newRecipe });
  } catch (error) {
    console.error(`Error creating recipe for user ${uid}:`, error);
    res.status(500).send('Error creating recipe');
  }
});

// レシピ更新
apiRouter.put('/recipes/:recipeId', async (req, res) => {
  const { recipeId } = req.params;
  const { uid } = req.user;
  try {
    const updatedRecipeData = req.body;
    const recipeRef = recipesCollection.doc(recipeId);
    const recipeDoc = await recipeRef.get();

    if (!recipeDoc.exists) {
      return res.status(404).send('Recipe not found');
    }

    await recipeRef.update(updatedRecipeData);
    const newRecipeData = { ...recipeDoc.data(), ...updatedRecipeData };

    res.json({ id: recipeId, ...newRecipeData });
  } catch (error) {
    console.error(`Error updating recipe ${recipeId} for user ${uid}:`, error);
    res.status(500).send(`Error updating recipe ${recipeId}`);
  }
});

// レシピ削除
apiRouter.delete('/recipes/:recipeId', async (req, res) => {
  const { recipeId } = req.params;
  const { uid } = req.user;
  try {
    const recipeRef = recipesCollection.doc(recipeId);
    const recipeDoc = await recipeRef.get();

    if (!recipeDoc.exists) {
      return res.status(404).send('Recipe not found');
    }

    await recipeRef.delete();

    res.status(204).send();
  } catch (error) {
    console.error(`Error deleting recipe ${recipeId} for user ${uid}:`, error);
    res.status(500).send(`Error deleting recipe ${recipeId}`);
  }
});

// 画像アップロードAPI
apiRouter.post('/images/upload', authMiddleware, upload.single('image'), async (req, res) => {
  const { uid } = req.user;
  if (!req.file) {
    return res.status(400).send('No image file provided.');
  }

  try {
    const filename = `recipe_images/${uid}/${uuidv4()}-${req.file.originalname}`;
    const file = bucket.file(filename);

    const stream = file.createWriteStream({ // Use createWriteStream for uploading
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    stream.on('error', (err) => {
      console.error('Error uploading image to Firebase Storage:', err);
      res.status(500).send('Error uploading image.');
    });

    stream.on('finish', async () => {
      await file.makePublic(); // Make the file publicly accessible
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
      res.status(200).json({ imageUrl: publicUrl });
    });

    stream.end(req.file.buffer);

  } catch (error) {
    console.error(`Error processing image upload for user ${uid}:`, error);
    res.status(500).send('Error processing image upload.');
  }
});


// /api パスでルーターをマウント
app.use('/api', apiRouter);


const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
