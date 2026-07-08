-- Kavrulmuş Kahve — PostgreSQL şeması
-- Drizzle ORM kaynağı: db/schema.js
-- Migration: drizzle/0000_initial.sql

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    ad_soyad VARCHAR(255),
    telefon VARCHAR(30),
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    kayit_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    baslik VARCHAR(255) NOT NULL,
    tur VARCHAR(255) NOT NULL,
    fiyat NUMERIC NOT NULL,
    resim TEXT,
    stok INT DEFAULT 10
);

CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(50) PRIMARY KEY,
    tarih TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    musteri_ad VARCHAR(255),
    telefon VARCHAR(50),
    adres TEXT,
    odeme_yontemi VARCHAR(50),
    user_email VARCHAR(255),
    urunler JSONB,
    toplam_tutar NUMERIC,
    durum VARCHAR(50) DEFAULT 'Hazırlanıyor'
);

CREATE TABLE IF NOT EXISTS favorites (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    kullanici_ad VARCHAR(255) NOT NULL,
    puan INT NOT NULL CHECK (puan >= 1 AND puan <= 5),
    yorum TEXT NOT NULL,
    tarih TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS contact_messages (
    id SERIAL PRIMARY KEY,
    ad_soyad VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    konu VARCHAR(255) NOT NULL,
    mesaj TEXT NOT NULL,
    tarih TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    okundu BOOLEAN DEFAULT FALSE
);
