import os
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "public", "samples"))
os.makedirs(OUTPUT_DIR, exist_ok=True)

def generate_nevus():
    size = 256
    img = Image.new("RGB", (size, size), (225, 195, 175))
    draw = ImageDraw.Draw(img)
    # Skin texture
    noise = np.random.normal(0, 4, (size, size, 3)).astype(np.int16)
    arr = np.clip(np.array(img, dtype=np.int16) + noise, 0, 255).astype(np.uint8)
    img = Image.fromarray(arr)
    
    # Symmetrical oval
    overlay = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    d.ellipse([70, 75, 185, 180], fill=(110, 68, 48, 220))
    d.ellipse([85, 90, 170, 165], fill=(85, 50, 35, 230))
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=8))
    
    img.paste(overlay, (0, 0), overlay)
    path = os.path.join(OUTPUT_DIR, "sample-nevus.jpg")
    img.save(path, quality=92)
    print(f"Created {path}")

def generate_melanoma():
    size = 256
    img = Image.new("RGB", (size, size), (220, 190, 170))
    noise = np.random.normal(0, 5, (size, size, 3)).astype(np.int16)
    arr = np.clip(np.array(img, dtype=np.int16) + noise, 0, 255).astype(np.uint8)
    img = Image.fromarray(arr)
    
    overlay = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    
    # Irregular lobulated shape
    points = [
        (65, 80), (95, 60), (150, 65), (195, 95), (205, 140),
        (175, 190), (130, 210), (85, 195), (55, 150), (50, 110)
    ]
    d.polygon(points, fill=(80, 45, 35, 220))
    
    # Deep black/dark brown notch
    d.ellipse([80, 90, 145, 160], fill=(30, 20, 20, 240))
    # Reddish / erythematous margin
    d.ellipse([140, 100, 190, 165], fill=(155, 55, 45, 190))
    # Slate/grey hypopigmented area
    d.ellipse([90, 140, 135, 185], fill=(65, 60, 65, 200))
    
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=5))
    img.paste(overlay, (0, 0), overlay)
    path = os.path.join(OUTPUT_DIR, "sample-melanoma.jpg")
    img.save(path, quality=92)
    print(f"Created {path}")

def generate_bcc():
    size = 256
    img = Image.new("RGB", (size, size), (228, 200, 185))
    noise = np.random.normal(0, 4, (size, size, 3)).astype(np.int16)
    arr = np.clip(np.array(img, dtype=np.int16) + noise, 0, 255).astype(np.uint8)
    img = Image.fromarray(arr)
    
    overlay = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    
    # Pearly pink elevated papule
    d.ellipse([65, 70, 190, 185], fill=(215, 145, 140, 200))
    d.ellipse([90, 95, 165, 160], fill=(235, 170, 165, 230))
    
    # Central shallow crust/ulceration
    d.ellipse([115, 115, 145, 140], fill=(130, 60, 50, 220))
    
    # Arborizing fine telangiectasias (tiny blood vessels)
    d.line([(100, 120), (80, 105), (75, 95)], fill=(180, 40, 40, 240), width=2)
    d.line([(140, 125), (165, 115), (175, 105)], fill=(180, 40, 40, 240), width=2)
    d.line([(125, 140), (135, 165), (145, 175)], fill=(180, 40, 40, 240), width=2)
    
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=4))
    img.paste(overlay, (0, 0), overlay)
    path = os.path.join(OUTPUT_DIR, "sample-bcc.jpg")
    img.save(path, quality=92)
    print(f"Created {path}")

if __name__ == "__main__":
    generate_nevus()
    generate_melanoma()
    generate_bcc()
    print("All sample lesions generated in public/samples/!")
