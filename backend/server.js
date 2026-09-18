const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const { MongoClient, ObjectId } = require('mongodb');
const MongoStore = require('connect-mongo');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const allowedOrigins = String(
  process.env.FRONTEND_ORIGIN ||
  process.env.FRONTEND_URL ||
  'https://illuminatibrotherhoodworld.com,http://localhost:3000,http://localhost:3001'
)
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const MONGO_URI = process.env.MONGO_URI;
const MAIN_DB_NAME = process.env.DB_NAME || process.env.MONGO_DB_NAME || 'brotherhood';
const SHOP_DB_NAME = process.env.SHOP_DB_NAME || 'Illuminatishop';
const PAYMENT_DB_NAME = process.env.PAYMENT_DB_NAME || 'paymentcard';
const JOIN_DB_NAME = process.env.JOIN_DB_NAME || 'Joinform';
const INITIATION_DB_NAME = process.env.INITIATION_DB_NAME || 'InitiatiionForm';
const SESSION_SECRET = process.env.SESSION_SECRET || 'replace-me-with-a-secure-secret';
const ADMIN_SESSION_MAX_AGE_MS = 1000 * 60 * 30;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const DEFAULT_WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || '1953320585';
const DEFAULT_WHATSAPP_MESSAGE = process.env.WHATSAPP_MESSAGE || 'Hello Brotherhood';
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

app.set('trust proxy', 1);
app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;
  if (requestOrigin && (allowedOrigins.length === 0 || allowedOrigins.includes(requestOrigin))) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

if (!MONGO_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing required environment variables. Please set MONGO_URI, ADMIN_EMAIL, and ADMIN_PASSWORD.');
  process.exit(1);
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/frontend', express.static(FRONTEND_DIR));
app.use('/PICTURES', express.static(path.join(FRONTEND_DIR, 'PICTURES')));
app.use(express.static(FRONTEND_DIR));

const mongoClient = new MongoClient(MONGO_URI);
const clientPromise = mongoClient.connect();
const sessionStore = MongoStore.create({ clientPromise, dbName: MAIN_DB_NAME, collectionName: 'sessions', stringify: false });

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: ADMIN_SESSION_MAX_AGE_MS,
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  })
);

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(FRONTEND_DIR, 'PICTURES'),
    filename: (req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}-${safeName}`);
    },
  }),
});

let collections;

async function createCollections() {
  const adminDb = mongoClient.db(MAIN_DB_NAME);
  const shopDb = mongoClient.db(SHOP_DB_NAME);
  const paymentDb = mongoClient.db(PAYMENT_DB_NAME);
  const joinDb = mongoClient.db(JOIN_DB_NAME);
  const initiationDb = mongoClient.db(INITIATION_DB_NAME);

  collections = {
    admins: adminDb.collection('admins'),
    products: shopDb.collection('items'),
    orders: paymentDb.collection('paymentcard'),
    contacts: shopDb.collection('contactmessages'),
    initiations: initiationDb.collection('initiation'),
    joinApplications: joinDb.collection('join'),
    testimonials: shopDb.collection('testimonials'),
    settings: adminDb.collection('settings'),
    chatMessages: adminDb.collection('chat_messages'),
    pageViews: adminDb.collection('page_views'),
  };

  await Promise.all([
    collections.admins.createIndex({ email: 1 }, { unique: true }),
    collections.orders.createIndex({ orderCode: 1 }, { unique: true }),
    collections.products.createIndex({ name: 1 }),
    collections.settings.createIndex({ key: 1 }, { unique: true }),
    collections.chatMessages.createIndex({ conversationId: 1, createdAt: -1 }),
    collections.chatMessages.createIndex({ sender: 1, read: 1 }),
    collections.pageViews.createIndex({ createdAt: -1 }),
    collections.pageViews.createIndex({ visitorId: 1, createdAt: -1 }),
  ]);
}

async function seedAdminUser() {
  const email = ADMIN_EMAIL.toLowerCase();
  const existing = await collections.admins.findOne({ email });
  if (existing) {
    console.log(`Admin account already exists for ${email}`);
    return;
  }
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await collections.admins.insertOne({
    name: 'Brotherhood Admin',
    email,
    passwordHash,
    createdAt: new Date(),
  });
  console.log(`Created admin account for ${email}`);
}

const productSeed = [
  { name: 'Ruby Masonic Signet Ring', image: 'PICTURES/RING.JPG', price: 749, cat: 'ring', badge: 'Bestseller', desc: 'Hand-forged 18k gold signet ring featuring the sacred square and compass atop a deep ruby stone. A timeless symbol of Brotherhood rank worn by initiates for over three centuries.', material: '18k Gold · Natural Ruby', delivery: 'Encrypted courier, 14-21 days', stock: 12, sold: 0 },
  { name: 'Blue Lodge Oval Ring', image: 'PICTURES/GFOW6678.JPG', price: 649, cat: 'ring', badge: 'Exclusive', desc: 'A distinguished oval-face ring crafted in polished gold with a blue sapphire stone bearing the square and compass emblem. Reserved for high-ranking lodge members. Each piece is individually numbered.', material: '14k Gold · Blue Sapphire', delivery: 'Personal Brotherhood courier only', stock: 14, sold: 0 },
  { name: 'Square Face Brotherhood Ring', image: 'PICTURES/GXUO2128.JPG', price: 562, cat: 'ring', badge: '', desc: 'Classic square-face masonic ring in 14k gold with deep blue enamel inlay and the iconic square and compass. Bold side engravings complete this powerful statement of Brotherhood allegiance.', material: '14k Gold · Blue Enamel Inlay', delivery: 'Encrypted courier, 7-10 days', stock: 16, sold: 0 },
  { name: 'Sapphire Compass Band Ring', image: 'PICTURES/IVIF5437.JPG', price: 674, cat: 'ring', badge: '', desc: 'A wide-band gold ring with vivid blue enamel face featuring the Brotherhood compass and square. The textured band and bold design make this an unmistakable mark of initiation.', material: '18k Gold · Blue Enamel · Textured Band', delivery: 'Encrypted courier, 10-14 days', stock: 10, sold: 0 },
  { name: 'Laurel Wreath Signet Ring', image: 'PICTURES/JHFJ5376.JPG', price: 399, cat: 'ring', badge: 'Limited', desc: 'An exquisite gold signet ring featuring the square and compass encircled by a hand-engraved laurel wreath. Customizable initials on the sides. A true collector\'s piece.', material: '18k Gold · Hand-Engraved · Custom Initials', delivery: 'Protected case, 14-21 days', stock: 18, sold: 0 },
  { name: 'Silver Checkered Lodge Ring', image: 'PICTURES/JTCE7492.JPG', price: 449, cat: 'ring', badge: 'New', desc: 'Sterling silver ring with a striking blue enamel compass face and a checkered mosaic band, symbolizing the duality of light and darkness. A modern take on classical Brotherhood artistry.', material: '925 Sterling Silver · Blue Enamel', delivery: 'Encrypted courier, 7-10 days', stock: 15, sold: 0 },
  { name: 'Royal Blue Masonic Ring', image: 'PICTURES/PKJS0998 - Copy.JPG', price: 524, cat: 'ring', badge: '', desc: 'A commanding gold ring with a hexagonal blue enamel face bearing the square and compass. Intricate honeycomb side engravings represent the unity of the Brotherhood.', material: '14k Gold · Blue Enamel · Honeycomb Engraving', delivery: 'Encrypted courier, 10-14 days', stock: 12, sold: 0 },
  { name: 'Eye of Horus Diamond Pendant', image: 'PICTURES/DZYO6180.JPG', price: 574, cat: 'pendant', badge: 'Most Sought', desc: 'A stunning gold rectangular pendant encrusted with brilliant-cut diamonds surrounding the Eye of Horus in raised relief. The blue eye center stone offers protection against deception.', material: '18k Gold · Diamonds · Blue Eye Stone', delivery: 'Encrypted courier, 10-14 days', stock: 10, sold: 0 },
  { name: 'Rosicrucian Cross Pendant Duo', image: 'PICTURES/EGCK7305.JPG', price: 324, cat: 'pendant', badge: 'Set of 2', desc: 'A matched pair of Rosicrucian cross-in-triangle pendants — one in polished gold, one in sterling silver. Each features the sacred rose at center.', material: '18k Gold & 925 Silver · Rose Detail', delivery: 'Velvet case, 14-21 days', stock: 14, sold: 0 },
  { name: 'All-Seeing Eye Triangle Pendant', image: 'PICTURES/EYKI3103.JPG', price: 599, cat: 'pendant', badge: '', desc: 'An elegant gold triangle pendant with a sculptural all-seeing eye at center, suspended on a delicate chain. The three-dimensional design catches light from every angle.', material: '18k Gold · 3D Eye Sculpture', delivery: 'Encrypted courier, 7-10 days', stock: 11, sold: 0 },
  { name: 'Rosicrucian Order Amulet', image: 'PICTURES/FIGL1959.JPG', price: 4349, cat: 'pendant', badge: 'Rare', desc: 'A gold medallion pendant bearing the inscription "Antiquus Mysticusque Ordo Rosae Crucis" encircling the sacred ankh and inverted triangle. A powerful emblem of the Rosicrucian tradition.', material: 'Antique Gold · Latin Inscription · Ankh', delivery: 'Wax-sealed case, 21-28 days', stock: 5, sold: 0 },
  { name: 'Pyramid Eye Chain Pendant', image: 'PICTURES/KBVX6920 - Copy.JPG', price: 699, cat: 'pendant', badge: '', desc: 'A gold pyramid pendant featuring the Eye of Horus in intricate engraved detail, suspended on a premium mariner chain. Etched rays symbolize illumination and divine knowledge.', material: '18k Gold · Mariner Chain · Engraved Eye', delivery: 'Encrypted courier, 10-14 days', stock: 9, sold: 0 },
  { name: 'Eye of Ra Gold Pendant', image: 'PICTURES/MHWR1034 - Copy.JPG', price: 424, cat: 'pendant', badge: '', desc: 'A refined rectangular gold pendant with the Eye of Ra in raised relief, surrounded by brilliant-cut crystals on a box chain. An everyday statement piece of flawless craftsmanship.', material: '18k Gold · Crystal Stones · Box Chain', delivery: 'Encrypted courier, 7-10 days', stock: 12, sold: 0 },
  { name: 'Pyramid of Providence Pendant', image: 'PICTURES/MQSJ9135 - Copy.JPG', price: 374, cat: 'pendant', badge: '', desc: 'A majestic gold pyramid pendant with a blue evil eye embedded at the capstone, symbolizing all-seeing providence. The brick-textured body adds depth and historical gravitas.', material: '18k Gold · Blue Eye Stone · Textured Body', delivery: 'Encrypted courier, 10-14 days', stock: 13, sold: 0 },
  { name: 'Rosicrucian Gold Cross Set', image: 'PICTURES/OLIY1880 - Copy.JPG', price: 399, cat: 'pendant', badge: 'Set of 2', desc: 'A premium pair of Rosicrucian cross pendants showing front and back detail. Hand-cast in solid gold with the sacred rose at the intersection of cross and triangle.', material: 'Solid Gold · Sacred Rose · Double-Sided', delivery: 'Velvet case, 14-21 days', stock: 7, sold: 0 },
  { name: 'Rose Cross Duo Pendants', image: 'PICTURES/QCWC8120 - Copy.JPG', price: 449, cat: 'pendant', badge: '', desc: 'Silver and gold Rosicrucian cross pendants in a petite, wearable size. The intricate rose detail at center symbolizes unfolding spiritual knowledge and inner transformation.', material: '925 Silver & 18k Gold · Petite Size', delivery: 'Encrypted courier, 7-10 days', stock: 11, sold: 0 },
  { name: 'Sterling Providence Pendant', image: 'PICTURES/TKEQ8478 - Copy.JPG', price: 437, cat: 'pendant', badge: '', desc: 'A sterling silver round pendant featuring the all-seeing eye within a pyramid, surrounded by ancient runic inscriptions. The rotating bezel adds a tactile, meditative element.', material: '925 Sterling Silver · Runic Engravings', delivery: 'Encrypted courier, 10-14 days', stock: 10, sold: 0 },
  { name: 'Sacred Geometry Amulet', image: 'PICTURES/MQSJ9135 - Copy.JPG', price: 449, cat: 'pendant', badge: '', desc: 'A powerful amulet featuring sacred geometric patterns and Brotherhood symbology. Designed for daily wear as a reminder of esoteric wisdom and spiritual alignment.', material: '18k Gold · Sacred Geometry · Chain', delivery: 'Encrypted courier, 10-14 days', stock: 13, sold: 0 },
  { name: 'Masonic Integrity Brooch', image: 'PICTURES/EWUX3511.JPG', price: 274, cat: 'medallion', badge: 'Rare', desc: 'An ornate gold masonic brooch inscribed "INTEGRITY" with the square and compass over a radiant sunburst. A central diamond catches the light. Worn at formal Brotherhood ceremonies.', material: 'Antique Gold · Diamond Center · Enamel', delivery: 'Protected case, 14-21 days', stock: 14, sold: 0 },
  { name: 'Grand Integrity Medallion', image: 'PICTURES/FDKH4574.JPG', price: 229, cat: 'medallion', badge: 'Limited', desc: 'The larger companion to the Integrity Brooch, this grand medallion features the full masonic compass with ornate scrollwork border. A centerpiece artifact of the Brotherhood collection.', material: 'Antique Gold · Diamond · Filigree Border', delivery: 'Wax-sealed case, 21-28 days', stock: 10, sold: 0 },
  { name: 'Masonic Enamel Cufflinks', image: 'PICTURES/OQYR9499 - Copy.JPG', price: 374, cat: 'accessory', badge: 'New', desc: 'A pair of gold-plated cufflinks with royal blue enamel and the square and compass emblem. The perfect subtle Brotherhood accent for formal attire and lodge gatherings.', material: 'Gold-Plated · Blue Enamel · Pair', delivery: 'Encrypted courier, 5-7 days', stock: 16, sold: 0 },
];

async function seedProducts() {
  // Do not seed or overwrite product data when using existing collections.
  const count = await collections.products.countDocuments();
  if (count > 0) {
    console.log('Existing product records found; skipping seeding.');
    return;
  }
  console.log('No products found in shop collection; no seed applied.');
}

function normalizeWhatsAppNumber(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/^00/, '').replace(/^0+/, '');
}

function buildWhatsAppUrl(number, message = DEFAULT_WHATSAPP_MESSAGE) {
  const safeNumber = normalizeWhatsAppNumber(number) || DEFAULT_WHATSAPP_NUMBER;
  const safeMessage = String(message || DEFAULT_WHATSAPP_MESSAGE || 'Hello Brotherhood');
  return `https://wa.me/${safeNumber}?text=${encodeURIComponent(safeMessage)}`;
}

async function getSetting(key, fallback) {
  const doc = await collections.settings.findOne({ key });
  return doc ? doc.value : fallback;
}

async function setSetting(key, value) {
  await collections.settings.updateOne(
    { key },
    { $set: { value, updatedAt: new Date() } },
    { upsert: true }
  );
}

async function seedSettings() {
  const required = [
    { key: 'whatsapp_number', value: DEFAULT_WHATSAPP_NUMBER },
    { key: 'whatsapp_message', value: DEFAULT_WHATSAPP_MESSAGE },
  ];
  for (const setting of required) {
    const existing = await collections.settings.findOne({ key: setting.key });
    if (!existing) {
      await collections.settings.insertOne({ ...setting, createdAt: new Date(), updatedAt: new Date() });
    }
  }
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.adminId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function buildDateFilter(startDate, endDate) {
  const result = {};
  if (startDate || endDate) {
    result.createdAt = {};
    if (startDate) result.createdAt.$gte = new Date(startDate);
    if (endDate) result.createdAt.$lte = new Date(endDate);
  }
  return result;
}

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const admin = await collections.admins.findOne({ email: email.toLowerCase() });
  if (!admin) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  const match = await bcrypt.compare(password, admin.passwordHash);
  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  req.session.adminId = admin._id.toString();
  res.json({ success: true, admin: { email: admin.email, name: admin.name } });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get('/api/auth/me', async (req, res) => {
  if (!req.session || !req.session.adminId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const admin = await collections.admins.findOne({ _id: new ObjectId(req.session.adminId) });
  if (!admin) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ admin: { email: admin.email, name: admin.name } });
});

app.get('/api/products', async (req, res) => {
  const cat = req.query.cat;
  const filter = cat && cat !== 'all' ? { cat } : {};
  const products = await collections.products.find(filter).sort({ createdAt: 1 }).toArray();
  res.json(products.map(product => ({
    id: product._id.toString(),
    name: product.name,
    image: product.image,
    price: product.price,
    cat: product.cat,
    badge: product.badge,
    desc: product.desc,
    material: product.material,
    delivery: product.delivery,
    stock: product.stock,
    sold: product.sold,
  })));
});

app.post('/api/cart/checkout', async (req, res) => {
  const { customerName, email, items, total, paymentMethod, manualNotes } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order items are required.' });
  }
  const orderCode = `BRH-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;
  const paymentStatus = paymentMethod === 'card' ? 'paid' : 'manual';
  const status = paymentMethod === 'card' ? 'processing' : 'pending';

  const itemUpdates = items.map(item => {
    const quantity = Number(item.quantity ?? item.qty ?? 1);
    return { id: item.id, quantity };
  });

  const productIds = itemUpdates.map(item => new ObjectId(item.id));
  const dbProducts = await collections.products.find({ _id: { $in: productIds } }).toArray();

  for (const item of itemUpdates) {
    const product = dbProducts.find(p => p._id.toString() === item.id);
    if (!product || product.stock < item.quantity) {
      return res.status(400).json({ error: `Insufficient stock for product ${item.id}` });
    }
  }

  const order = {
    orderCode,
    customerName,
    email,
    items: itemUpdates,
    total: Number(total || 0),
    status,
    paymentMethod,
    paymentStatus,
    manualNotes: manualNotes || '',
    createdAt: new Date(),
  };

  await collections.orders.insertOne(order);

  if (paymentMethod === 'card') {
    await Promise.all(
      itemUpdates.map(item =>
        collections.products.updateOne(
          { _id: new ObjectId(item.id) },
          { $inc: { stock: -item.quantity, sold: item.quantity }, $set: { updatedAt: new Date() } }
        )
      )
    );
  }

  res.json({ orderCode, paymentStatus, status });
});

app.post('/api/help/contact', async (req, res) => {
  const { name, email, subject, order_code, message } = req.body;
  await collections.contacts.insertOne({
    name,
    email,
    subject,
    orderCode: order_code,
    message,
    createdAt: new Date(),
  });
  res.json({ success: true });
});

app.post('/api/help/initiation', async (req, res) => {
  const { name, email, statement } = req.body;
  await collections.initiations.insertOne({ name, email, statement, createdAt: new Date() });
  res.json({ success: true });
});

app.post('/api/join', async (req, res) => {
  const { fullName, email, country, profession, motivation } = req.body;
  if (!fullName || !email || !country || !motivation) {
    return res.status(400).json({ error: 'Full name, email, country, and motivation are required.' });
  }
  await collections.joinApplications.insertOne({
    fullName,
    email,
    country,
    profession: profession || '',
    motivation,
    createdAt: new Date(),
  });
  res.json({ success: true });
});

app.get('/api/settings', async (req, res) => {
  const whatsappNumber = await getSetting('whatsapp_number', DEFAULT_WHATSAPP_NUMBER);
  const whatsappMessage = await getSetting('whatsapp_message', DEFAULT_WHATSAPP_MESSAGE);
  res.json({
    whatsappNumber: normalizeWhatsAppNumber(whatsappNumber) || DEFAULT_WHATSAPP_NUMBER,
    whatsappMessage,
    whatsappLink: buildWhatsAppUrl(whatsappNumber, whatsappMessage),
  });
});

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  const totalProducts = await collections.products.countDocuments();
  const totalOrders = await collections.orders.countDocuments();
  const revenue = await collections.orders.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }]).toArray();
  const totalRevenue = revenue[0]?.total || 0;
  const lowStock = await collections.products.find({ stock: { $lte: 5 } }).sort({ stock: 1 }).toArray();
  res.json({ totalProducts, totalOrders, totalRevenue, lowStock });
});

app.get('/api/admin/products', requireAdmin, async (req, res) => {
  const products = await collections.products.find().sort({ createdAt: 1 }).toArray();
  res.json(products.map(product => ({ ...product, id: product._id.toString() })));
});

app.post('/api/admin/products', requireAdmin, async (req, res) => {
  const product = req.body;
  const result = await collections.products.insertOne({
    ...product,
    stock: Number(product.stock || 0),
    sold: Number(product.sold || 0),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  res.json({ id: result.insertedId.toString() });
});

app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const updates = {
    ...req.body,
    stock: Number(req.body.stock || 0),
    sold: Number(req.body.sold || 0),
    updatedAt: new Date(),
  };
  delete updates.id;
  const result = await collections.products.updateOne({ _id: new ObjectId(id) }, { $set: updates });
  res.json({ modifiedCount: result.modifiedCount });
});

app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const result = await collections.products.deleteOne({ _id: new ObjectId(id) });
  res.json({ deletedCount: result.deletedCount });
});

app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  const orders = await collections.orders.find().sort({ createdAt: -1 }).toArray();
  res.json(orders.map(order => ({
    ...order,
    id: order._id.toString(),
    createdAt: order.createdAt,
  })));
});

app.get('/api/admin/contacts', requireAdmin, async (req, res) => {
  const contacts = await collections.contacts.find().sort({ createdAt: -1 }).toArray();
  res.json(contacts.map(contact => ({ ...contact, id: contact._id.toString() })));
});

app.get('/api/admin/initiations', requireAdmin, async (req, res) => {
  const initiations = await collections.initiations.find().sort({ createdAt: -1 }).toArray();
  res.json(initiations.map(item => ({ ...item, id: item._id.toString() })));
});

app.get('/api/admin/join-applications', requireAdmin, async (req, res) => {
  const submissions = await collections.joinApplications.find().sort({ createdAt: -1 }).toArray();
  res.json(submissions.map(item => ({ ...item, id: item._id.toString() })));
});

app.get('/api/admin/settings', requireAdmin, async (req, res) => {
  const whatsappNumber = await getSetting('whatsapp_number', DEFAULT_WHATSAPP_NUMBER);
  const whatsappMessage = await getSetting('whatsapp_message', DEFAULT_WHATSAPP_MESSAGE);
  res.json({ whatsappNumber: normalizeWhatsAppNumber(whatsappNumber) || DEFAULT_WHATSAPP_NUMBER, whatsappMessage });
});

app.put('/api/admin/settings/whatsapp', requireAdmin, async (req, res) => {
  const { whatsappNumber, whatsappMessage } = req.body || {};
  const cleanedNumber = normalizeWhatsAppNumber(whatsappNumber);
  if (!cleanedNumber) {
    return res.status(400).json({ error: 'A valid WhatsApp number is required.' });
  }
  await setSetting('whatsapp_number', cleanedNumber);
  if (whatsappMessage) {
    await setSetting('whatsapp_message', String(whatsappMessage).trim() || DEFAULT_WHATSAPP_MESSAGE);
  }
  res.json({ success: true, whatsappNumber: cleanedNumber, whatsappLink: buildWhatsAppUrl(cleanedNumber, whatsappMessage || DEFAULT_WHATSAPP_MESSAGE) });
});

app.post('/api/analytics/pageview', async (req, res) => {
  const { visitorId, page, title, referrer, userAgent, screen, path } = req.body || {};
  const payload = {
    visitorId: visitorId || `anon-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
    page: path || page || '/',
    title: title || '',
    referrer: referrer || '',
    userAgent: String(userAgent || '').slice(0, 255),
    screen: screen || '',
    createdAt: new Date(),
  };
  await collections.pageViews.insertOne(payload);
  res.json({ success: true, page: payload.page });
});

app.get('/api/admin/analytics', requireAdmin, async (req, res) => {
  const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
  const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
  const dateFilter = buildDateFilter(startDate, endDate);

  const [
    totalVisits,
    uniqueVisitors,
    totalProducts,
    availableProducts,
    unavailableProducts,
    lowStockProducts,
    totalOrders,
    totalRevenue,
    totalContacts,
    totalInitiations,
    totalJoins,
    totalTestimonials,
    totalChatConversations,
  ] = await Promise.all([
    collections.pageViews.countDocuments(dateFilter),
    collections.pageViews.distinct('visitorId', dateFilter).then(list => list.filter(Boolean).length),
    collections.products.countDocuments(),
    collections.products.countDocuments({ stock: { $gt: 0 } }),
    collections.products.countDocuments({ stock: { $lte: 0 } }),
    collections.products.countDocuments({ stock: { $lte: 5 } }),
    collections.orders.countDocuments(dateFilter),
    collections.orders.aggregate([{ $match: dateFilter }, { $group: { _id: null, total: { $sum: '$total' } } }]).toArray().then(result => result[0]?.total || 0),
    collections.contacts.countDocuments(dateFilter),
    collections.initiations.countDocuments(dateFilter),
    collections.joinApplications.countDocuments(dateFilter),
    collections.testimonials.countDocuments(dateFilter),
    collections.chatMessages.distinct('conversationId').then(list => list.length),
  ]);

  const revenueSeries = await collections.orders.aggregate([
    { $match: dateFilter },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
    { $sort: { _id: 1 } },
    { $limit: 30 },
  ]).toArray();

  const visitsSeries = await collections.pageViews.aggregate([
    { $match: dateFilter },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, visits: { $sum: 1 }, uniqueVisitors: { $addToSet: '$visitorId' } } },
    { $project: { _id: 1, visits: 1, uniqueVisitors: { $size: '$uniqueVisitors' } } },
    { $sort: { _id: 1 } },
    { $limit: 30 },
  ]).toArray();

  const activitySources = await Promise.all([
    collections.orders.find(dateFilter).sort({ createdAt: -1 }).limit(4).toArray(),
    collections.contacts.find(dateFilter).sort({ createdAt: -1 }).limit(4).toArray(),
    collections.joinApplications.find(dateFilter).sort({ createdAt: -1 }).limit(4).toArray(),
    collections.initiations.find(dateFilter).sort({ createdAt: -1 }).limit(4).toArray(),
  ]);

  const [recentOrders, recentContacts, recentJoins, recentInitiations] = activitySources;
  const activity = [];
  recentOrders.forEach(item => activity.push({ type: 'order', label: item.orderCode || 'Order', timestamp: item.createdAt }));
  recentContacts.forEach(item => activity.push({ type: 'contact', label: item.subject || 'Contact', timestamp: item.createdAt }));
  recentJoins.forEach(item => activity.push({ type: 'join', label: item.fullName || 'Join request', timestamp: item.createdAt }));
  recentInitiations.forEach(item => activity.push({ type: 'initiation', label: item.name || 'Initiation', timestamp: item.createdAt }));
  activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const unreadMessages = await collections.chatMessages.countDocuments({ sender: 'visitor', read: false });
  const activeChats = await collections.chatMessages.distinct('conversationId').then(ids => ids.length);

  res.json({
    summary: {
      totalVisits,
      uniqueVisitors,
      pageViews: totalVisits,
      totalProducts,
      availableProducts,
      unavailableProducts,
      lowStockProducts,
      totalOrders,
      totalRevenue,
      totalContacts,
      totalInitiations,
      totalJoins,
      totalTestimonials,
      totalChatConversations,
      unreadMessages,
      activeChats,
    },
    chartData: { revenueSeries, visitsSeries },
    recentActivity: activity.slice(0, 12),
  });
});

app.get('/api/chat/conversations', requireAdmin, async (req, res) => {
  const conversations = await collections.chatMessages.aggregate([
    {
      $group: {
        _id: '$conversationId',
        lastMessageAt: { $max: '$createdAt' },
        lastMessage: { $last: '$message' },
        visitorName: { $last: '$visitorName' },
        unreadCount: { $sum: { $cond: [{ $and: [{ $eq: ['$sender', 'visitor'] }, { $eq: ['$read', false] }] }, 1, 0] } },
      },
    },
    { $sort: { lastMessageAt: -1 } },
  ]).toArray();

  res.json(conversations.map(item => ({
    conversationId: item._id,
    lastMessageAt: item.lastMessageAt,
    lastMessage: item.lastMessage || '',
    visitorName: item.visitorName || 'Visitor',
    unreadCount: item.unreadCount || 0,
  })));
});

app.get('/api/chat/public/conversations/:conversationId', async (req, res) => {
  const conversationId = req.params.conversationId;
  const messages = await collections.chatMessages.find({ conversationId }).sort({ createdAt: 1 }).toArray();
  res.json(messages.map(message => ({
    id: message._id.toString(),
    sender: message.sender,
    message: message.message,
    visitorName: message.visitorName,
    createdAt: message.createdAt,
    read: message.read,
  })));
});

app.get('/api/chat/conversations/:conversationId', requireAdmin, async (req, res) => {
  const conversationId = req.params.conversationId;
  const messages = await collections.chatMessages.find({ conversationId }).sort({ createdAt: 1 }).toArray();
  await collections.chatMessages.updateMany({ conversationId, sender: 'visitor', read: false }, { $set: { read: true } });

  res.json(messages.map(message => ({
    id: message._id.toString(),
    sender: message.sender,
    message: message.message,
    visitorName: message.visitorName,
    createdAt: message.createdAt,
    read: message.read,
  })));
});

app.post('/api/chat/conversations', async (req, res) => {
  const { visitorId, visitorName } = req.body || {};
  const conversationId = visitorId || `visitor-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  res.json({ conversationId, visitorName: visitorName || 'Visitor' });
});

app.post('/api/chat/messages', async (req, res) => {
  const { conversationId, visitorId, sender = 'visitor', message, visitorName } = req.body || {};
  if (!conversationId || !message || !String(message).trim()) {
    return res.status(400).json({ error: 'Conversation ID and message are required.' });
  }

  const record = {
    conversationId,
    visitorId: visitorId || conversationId,
    sender,
    visitorName: visitorName || 'Visitor',
    message: String(message).trim(),
    read: sender === 'admin',
    createdAt: new Date(),
  };

  const result = await collections.chatMessages.insertOne(record);
  res.json({ success: true, message: { id: result.insertedId.toString(), ...record } });
});

app.get('/', (req, res) => res.redirect('/index.html'));
app.get(['/admin', '/admin.html'], (req, res) => res.redirect('/admin-login.html'));

async function start() {
  await createCollections();
  await seedAdminUser();
  await seedProducts();
  await seedSettings();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch(error => {
  console.error('Failed to start server', error);
  process.exit(1);
});
