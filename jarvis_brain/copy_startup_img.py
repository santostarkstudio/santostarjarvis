import shutil
import os

src = r"C:\Users\santo\.gemini\antigravity-ide\brain\0a0289ca-5538-438a-9348-15df38ffaf5b\.user_uploaded\media_1786813700950.jpg"
dst_dir = r"c:\Users\santo\OneDrive\Desktop\ultron-by-sagar-builds-main\public"
os.makedirs(dst_dir, exist_ok=True)
dst = os.path.join(dst_dir, "ironman_startup.jpg")
shutil.copyfile(src, dst)
print("Copied successfully, size:", os.path.getsize(dst))
