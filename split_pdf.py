import PyPDF2
import os

input_path = 'C:/Users/Lenovo/Desktop/freebuff/westhome/Westhome Updated catalogue july2026.pdf'
output_dir = 'C:/Users/Lenovo/Desktop/freebuff/westhome/split_pages'

os.makedirs(output_dir, exist_ok=True)

reader = PyPDF2.PdfReader(input_path)
total = len(reader.pages)
print(f"Total pages: {total}")

for i, page in enumerate(reader.pages):
    writer = PyPDF2.PdfWriter()
    writer.add_page(page)
    out_path = os.path.join(output_dir, f'page_{i+1:03d}.pdf')
    with open(out_path, 'wb') as f:
        writer.write(f)
    print(f"  Saved page {i+1}/{total} -> page_{i+1:03d}.pdf")

print(f"\nDone! {total} pages saved to: {output_dir}")
