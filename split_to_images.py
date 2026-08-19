import pymupdf
import os

input_dir = 'C:/Users/Lenovo/Desktop/freebuff/westhome/split_pages'
output_dir = 'C:/Users/Lenovo/Desktop/freebuff/westhome/split_images'

os.makedirs(output_dir, exist_ok=True)

pdf_files = sorted([f for f in os.listdir(input_dir) if f.endswith('.pdf')])
print(f"Converting {len(pdf_files)} pages to PNG images...\n")

for i, pdf_file in enumerate(pdf_files):
    pdf_path = os.path.join(input_dir, pdf_file)
    doc = pymupdf.open(pdf_path)
    page = doc[0]
    
    # Render at 2x resolution for quality
    mat = pymupdf.Matrix(2, 2)
    pix = page.get_pixmap(matrix=mat)
    
    out_name = pdf_file.replace('.pdf', '.png')
    out_path = os.path.join(output_dir, out_name)
    pix.save(out_path)
    doc.close()
    
    print(f"  [{i+1}/{len(pdf_files)}] {pdf_file} -> {out_name} ({pix.width}x{pix.height})")

print(f"\nDone! {len(pdf_files)} images saved to: {output_dir}")
