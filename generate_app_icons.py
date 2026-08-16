import os
import sys
from PIL import Image

src_img_path = r"C:\Users\santo\.gemini\antigravity-ide\brain\0a0289ca-5538-438a-9348-15df38ffaf5b\.user_uploaded\media_1786872629748.jpg"
target_dir_tauri = r"c:\Users\santo\OneDrive\Desktop\ultron-by-sagar-builds-main\src-tauri\icons"
target_dir_public = r"c:\Users\santo\OneDrive\Desktop\ultron-by-sagar-builds-main\public"

os.makedirs(target_dir_tauri, exist_ok=True)
os.makedirs(target_dir_public, exist_ok=True)

img = Image.open(src_img_path)
width, height = img.size

# Crop square around center/eyes
min_dim = min(width, height)
# Focus around vertical center (eyes are slightly above 50% or around 48%)
left = (width - min_dim) // 2
top = int(height * 0.35)
if top + min_dim > height:
    top = height - min_dim
if top < 0:
    top = 0
right = left + min_dim
bottom = top + min_dim

cropped = img.crop((left, top, right, bottom))
cropped = cropped.resize((512, 512), Image.Resampling.LANCZOS)

# Save PNG sizes
cropped.save(os.path.join(target_dir_tauri, "icon.png"), "PNG")
cropped.save(os.path.join(target_dir_public, "icon.png"), "PNG")
cropped.save(os.path.join(target_dir_public, "app-icon.png"), "PNG")

for size in [32, 128, 256, 512]:
    resized = cropped.resize((size, size), Image.Resampling.LANCZOS)
    if size == 32:
        resized.save(os.path.join(target_dir_tauri, "32x32.png"), "PNG")
    elif size == 128:
        resized.save(os.path.join(target_dir_tauri, "128x128.png"), "PNG")
    elif size == 256:
        resized.save(os.path.join(target_dir_tauri, "128x128@2x.png"), "PNG")

# Save multi-resolution Windows .ICO file
ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
cropped.save(
    os.path.join(target_dir_tauri, "icon.ico"),
    format="ICO",
    sizes=ico_sizes,
)
cropped.save(
    os.path.join(target_dir_public, "icon.ico"),
    format="ICO",
    sizes=ico_sizes,
)

print("[✓] Iron Man Helmet App Icons successfully generated for Windows EXE and Desktop!")
