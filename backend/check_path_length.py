from pathlib import Path

img = Path(r"C:\Users\ranga\Desktop\New folder (2)\filtered_dataset_archive\3d7cd880-ea4b-4d63-9706-bea1df54af20___135712d1400874352-skoda-rapid-1-6tdi-cr-mt-elegance-ultima-candy-white-white-monster-1911216_676392609084007_1524722860_o.jpg.jpg")
dst = Path(r"C:\Users\ranga\Desktop\New folder (2)\VEHICLE-MANAGEMENT-USING-AI\backend\data\images\train") / img.name
print('src len', len(str(img)))
print('dst len', len(str(dst)))
print('src', str(img))
print('dst', str(dst))
print('src exists', img.exists())
print('dst parent exists', dst.parent.exists())
