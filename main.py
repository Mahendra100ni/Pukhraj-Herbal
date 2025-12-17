import sqlite3
import jwt
import datetime
import os
import json
import io
import logging
from PIL import Image
from flask import Flask, render_template, request, jsonify, send_from_directory, session, redirect
from flask_cors import CORS
from werkzeug.security import check_password_hash
from uuid import uuid4
from datetime import timezone

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, template_folder="templates", static_folder="static")
app.secret_key = os.environ.get("SECRET_KEY", "pukhraj_secret_123_change_this_in_prod")
CORS(app, supports_credentials=True, origins=["*"])

SECRET_KEY = os.environ.get("JWT_SECRET", "PUKHRAJ_SUPER_SECRET_KEY_2025_CHANGE_THIS")

UPLOAD_DIR = "/data/static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.route('/uploads/<filename>')
def uploads_old(filename):
    return send_from_directory(UPLOAD_DIR, filename)

@app.route('/static/uploads/<filename>')
def static_uploads(filename):
    return send_from_directory(UPLOAD_DIR, filename)

@app.route('/static/uploads/<filename>')  # Dono tarah se kaam karega
def uploaded_file(filename):
    return send_from_directory(UPLOAD_DIR, filename)

# Database connection
def get_db():
    conn = sqlite3.connect("/data/database.db")
    conn.row_factory = sqlite3.Row
    return conn

# Initialize DB with tables and columns
def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        description TEXT,
        long_description TEXT,
        image TEXT,
        images TEXT,
        category TEXT,
        is_latest INTEGER DEFAULT 0
    )
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )
    """)
    
    cur.execute("SELECT COUNT(*) FROM admins")
    count = cur.fetchone()[0]
    if count == 0:
    hashed = "pbkdf2:sha256:100000$450b72d21dfa7d1c18b8290c0d894e907ff8c4a228c15e6553cb88f98a3f3dde"
    cur.execute("INSERT INTO admins (username, password) VALUES (?, ?)", ("admin", hashed))
    print("First admin created with hidden password!")
    else:
        print(f"{count} admin(s) already exist — no reset!")
    
    conn.commit()
    conn.close()

init_db()

def ensure_login():
    if not session.get("logged_in"):
        return jsonify({"error": "Unauthorized"}), 401
    return None

@app.route("/")
def home():
    return "Pukhraj Herbal API Running"

@app.route("/admin-login", methods=["GET"])
def admin_login_page():
    return render_template("admin-login.html")

@app.route("/admin-login", methods=["POST"])
def admin_login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM admins WHERE username = ?", (username,))
    row = cur.fetchone()
    conn.close()
    
    if row and check_password_hash(row["password"], password):
        session["logged_in"] = True
        token = jwt.encode({
            "username": username,
            "exp": datetime.datetime.now(timezone.utc) + datetime.timedelta(days=1)  # FIXED deprecation
        }, SECRET_KEY, algorithm="HS256")
        return jsonify({"message": "Login OK", "token": token})
    return jsonify({"error": "Invalid"}), 401

@app.route("/logout")
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})

@app.route("/check-auth")
def check_auth():
    if session.get("logged_in"):
        return jsonify({"status": "ok"})
    return jsonify({"status": "unauthorized"}), 401

@app.route("/admin")
def admin():
    if not session.get("logged_in"):
        return redirect("/admin-login")
    return render_template("admin.html")

from werkzeug.utils import secure_filename
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route("/upload", methods=["POST"])
def upload():
    file = request.files.get("file") or request.files.get("imageFile")
    if not file or file.filename == '':
        return jsonify({"error": "No file"}), 400
    
    if not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type! Only images allowed"}), 400
    
    if not file.mimetype.startswith('image/'):
        return jsonify({"error": "Only images allowed"}), 400

    original = file.read()
    img = Image.open(io.BytesIO(original))
    
    max_size = 1200
    if img.width > max_size:
        ratio = max_size / img.width
        new_height = int(img.height * ratio)
        img = img.resize((max_size, new_height), Image.LANCZOS) 
    
    filename = secure_filename(f"{uuid4().hex}_{file.filename}")
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    img.save(filepath, optimize=True, quality=85)  
    if img.format == "PNG":
        img.save(filepath, optimize=True)
    
    return jsonify({
        "url": f"/static/uploads/{filename}",
        "filename": filename
    })

@app.route("/products", methods=["GET"])
def get_products():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM products")
    rows = cur.fetchall()
    conn.close()
    
    # FIXED: Convert Row to dict
    plain_products = [dict(row) for row in rows]
    for p in plain_products:
        p["images"] = json.loads(p["images"] or "[]")
    
    grouped = {}
    for p in plain_products:
        cat = p["category"] or "uncategorized"
        grouped.setdefault(cat, []).append(p)
    return jsonify(grouped)

@app.route("/products/latest", methods=["GET"])
def get_latest():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM products WHERE is_latest = 1")
    rows = cur.fetchall()
    conn.close()
    
    # FIXED: Convert Row to dict
    plain_products = [dict(row) for row in rows]
    for p in plain_products:
        p["images"] = json.loads(p["images"] or "[]")
    return jsonify(plain_products)

@app.route("/products/<cat>", methods=["GET"])
def get_by_cat(cat):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM products WHERE category = ?", (cat,))
    rows = cur.fetchall()
    conn.close()
    plain_products = [dict(row) for row in rows]
    for p in plain_products:
        p['long_description'] = p.get('long_description') or ''
        p['images'] = json.loads(p.get('images') or '[]')
    return jsonify(plain_products)

@app.route("/products", methods=["POST"])
def add_product():
    check = ensure_login()
    if check: return check
    data = request.get_json()
    conn = get_db()
    cur = conn.cursor()
    try:
        sql = """
            INSERT INTO products 
            (name, description, long_description, category, is_latest, image, images)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """
        values = (
            data.get("name"),
            data.get("description", ""),
            data.get("long_description", ""),
            data.get("category"),
            1 if data.get("is_latest") else 0,
            data.get("image", ""),
            json.dumps(data.get("images", []))
        )
        cur.execute(sql, values)
        conn.commit()
        return jsonify({"message": "Product Added", "id": cur.lastrowid}), 201
    except Exception as e:
        logger.error(f"Add product error: {e}")
        return jsonify({"error": "Failed to add"}), 500
    finally:
        conn.close()

@app.route("/products/<int:pid>", methods=["PUT"])
def edit_product(pid):
    check = ensure_login()
    if check: return check
    data = request.get_json()
    conn = get_db()
    cur = conn.cursor()
    try:
        sql = """
            UPDATE products SET
                name = ?,
                description = ?,
                long_description = ?,
                category = ?,
                is_latest = ?,
                image = ?,
                images = ?
            WHERE id = ?
        """
        values = (
            data.get("name"),
            data.get("description", ""),
            data.get("long_description", ""),
            data.get("category"),
            1 if data.get("is_latest") else 0,
            data.get("image", ""),
            json.dumps(data.get("images", [])),
            pid
        )
        cur.execute(sql, values)
        conn.commit()
        return jsonify({"message": "Updated"})
    except Exception as e:
        logger.error(f"Update error: {e}")
        return jsonify({"error": "Failed to update"}), 500
    finally:
        conn.close()

@app.route("/products/<int:pid>", methods=["DELETE"])
def delete_product(pid):
    check = ensure_login()
    if check: return check
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM products WHERE id = ?", (pid,))
        conn.commit()
        return jsonify({"message": "Deleted"})
    except Exception as e:
        logger.error(f"Delete error: {e}")
        return jsonify({"error": "Failed to delete"}), 500
    finally:
        conn.close()








