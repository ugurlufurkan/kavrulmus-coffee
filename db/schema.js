// schema.sql ile uyumlu Drizzle şeması
const {
    pgTable,
    serial,
    varchar,
    text,
    timestamp,
    integer,
    numeric,
    boolean,
    jsonb,
    unique,
    check,
} = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

const users = pgTable('users', {
    id: serial('id').primaryKey(),
    adSoyad: varchar('ad_soyad', { length: 255 }),
    telefon: varchar('telefon', { length: 30 }),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password: text('password').notNull(),
    kayitTarihi: timestamp('kayit_tarihi').defaultNow(),
});

const products = pgTable('products', {
    id: serial('id').primaryKey(),
    baslik: varchar('baslik', { length: 255 }).notNull(),
    tur: varchar('tur', { length: 255 }).notNull(),
    fiyat: numeric('fiyat').notNull(),
    resim: text('resim'),
    stok: integer('stok').default(10),
});

const orders = pgTable('orders', {
    id: varchar('id', { length: 50 }).primaryKey(),
    tarih: timestamp('tarih').defaultNow(),
    musteriAd: varchar('musteri_ad', { length: 255 }),
    telefon: varchar('telefon', { length: 50 }),
    adres: text('adres'),
    odemeYontemi: varchar('odeme_yontemi', { length: 50 }),
    userEmail: varchar('user_email', { length: 255 }),
    urunler: jsonb('urunler'),
    toplamTutar: numeric('toplam_tutar'),
    durum: varchar('durum', { length: 50 }).default('Hazırlanıyor'),
});

const favorites = pgTable(
    'favorites',
    {
        id: serial('id').primaryKey(),
        userId: integer('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        productId: integer('product_id')
            .notNull()
            .references(() => products.id, { onDelete: 'cascade' }),
        createdAt: timestamp('created_at').defaultNow(),
    },
    (table) => [unique('favorites_user_product_unique').on(table.userId, table.productId)]
);

const reviews = pgTable(
    'reviews',
    {
        id: serial('id').primaryKey(),
        productId: integer('product_id')
            .notNull()
            .references(() => products.id, { onDelete: 'cascade' }),
        userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
        kullaniciAd: varchar('kullanici_ad', { length: 255 }).notNull(),
        puan: integer('puan').notNull(),
        yorum: text('yorum').notNull(),
        tarih: timestamp('tarih').defaultNow(),
    },
    (table) => [check('reviews_puan_check', sql`${table.puan} >= 1 AND ${table.puan} <= 5`)]
);

const passwordResetTokens = pgTable('password_reset_tokens', {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 255 }).notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    used: boolean('used').default(false),
});

const contactMessages = pgTable('contact_messages', {
    id: serial('id').primaryKey(),
    adSoyad: varchar('ad_soyad', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    konu: varchar('konu', { length: 255 }).notNull(),
    mesaj: text('mesaj').notNull(),
    tarih: timestamp('tarih').defaultNow(),
    okundu: boolean('okundu').default(false),
});

module.exports = {
    users,
    products,
    orders,
    favorites,
    reviews,
    passwordResetTokens,
    contactMessages,
};
