"""
Smart crop Westhome catalogue pages into individual e-commerce product images.
V3: Detect light/white GAPS between products instead of dark lines.
Product images are dark, so the separators are light-colored bands.
"""
import cv2
import numpy as np
import os
import json

INPUT_DIR = 'C:/Users/Lenovo/Desktop/freebuff/westhome/split_images'
OUTPUT_DIR = 'C:/Users/Lenovo/Desktop/freebuff/westhome/product_images'
os.makedirs(OUTPUT_DIR, exist_ok=True)

MANIFEST = []


def find_light_gaps(gray, min_gap_width=8):
    """
    Find horizontal and vertical light/white bands that span the full page.
    These are the actual separators between products in a dark catalogue.
    """
    h, w = gray.shape
    
    # --- Horizontal gaps: rows where most pixels are very bright ---
    # A "gap" row has high average brightness
    h_gap_rows = []
    for y in range(h):
        # Fraction of very bright pixels
        bright_frac = np.mean(gray[y, :] > 240)
        if bright_frac > 0.85:  # 85% of the row is bright
            h_gap_rows.append(y)
    
    # Cluster consecutive gap rows into bands
    h_gaps = []
    if h_gap_rows:
        groups = np.split(h_gap_rows, np.where(np.diff(h_gap_rows) > 3)[0] + 1)
        for g in groups:
            gap_width = g[-1] - g[0]
            if gap_width >= min_gap_width:
                h_gaps.append((g[0], g[-1]))
    
    # --- Vertical gaps: cols where most pixels are very bright ---
    v_gap_cols = []
    for x in range(w):
        bright_frac = np.mean(gray[:, x] > 240)
        if bright_frac > 0.85:
            v_gap_cols.append(x)
    
    v_gaps = []
    if v_gap_cols:
        groups = np.split(v_gap_cols, np.where(np.diff(v_gap_cols) > 3)[0] + 1)
        for g in groups:
            gap_width = g[-1] - g[0]
            if gap_width >= min_gap_width:
                v_gaps.append((g[0], g[-1]))
    
    return h_gaps, v_gaps


def find_content_bbox(gray, threshold=245):
    """Find bounding box of non-white content."""
    h, w = gray.shape
    content = gray < threshold
    rows = np.where(content.any(axis=1))[0]
    cols = np.where(content.any(axis=0))[0]
    if len(rows) == 0 or len(cols) == 0:
        return 0, 0, w, h
    return int(cols[0]), int(rows[0]), int(cols[-1]), int(rows[-1])


def split_by_gaps(img, gray, h_gaps, v_gaps):
    """Split image using detected light gaps between products."""
    h, w = gray.shape
    
    # Build split boundaries from gaps
    h_splits = [0]
    for gap_start, gap_end in h_gaps:
        mid = (gap_start + gap_end) // 2
        h_splits.append(mid)
    h_splits.append(h)
    
    v_splits = [0]
    for gap_start, gap_end in v_gaps:
        mid = (gap_start + gap_end) // 2
        v_splits.append(mid)
    v_splits.append(w)
    
    products = []
    for i in range(len(h_splits) - 1):
        for j in range(len(v_splits) - 1):
            y1 = h_splits[i]
            y2 = h_splits[i + 1]
            x1 = v_splits[j]
            x2 = v_splits[j + 1]
            
            cell_w = x2 - x1
            cell_h = y2 - y1
            
            # Skip too-small cells
            if cell_w < 80 or cell_h < 80:
                continue
            
            # Check if cell has meaningful content
            cell_gray = gray[y1:y2, x1:x2]
            avg = np.mean(cell_gray)
            if avg > 252:  # pure white — skip
                continue
            
            # Check content density
            content_frac = np.mean(cell_gray < 240)
            if content_frac < 0.05:  # less than 5% content — skip
                continue
            
            products.append((x1, y1, x2, y2))
    
    return products


def smart_crop(img, gray, bbox, padding_pct=0.02):
    """Crop to bounding box with small padding."""
    x1, y1, x2, y2 = bbox
    h, w = img.shape[:2]
    
    pad_x = int((x2 - x1) * padding_pct)
    pad_y = int((y2 - y1) * padding_pct)
    x1 = max(0, x1 - pad_x)
    y1 = max(0, y1 - pad_y)
    x2 = min(w, x2 + pad_x)
    y2 = min(h, y2 + pad_y)
    
    return img[y1:y2, x1:x2].copy()


def process_page(page_num, img_path):
    """Process a single page and extract product images."""
    img = cv2.imread(img_path)
    if img is None:
        return []
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    
    h_gaps, v_gaps = find_light_gaps(gray)
    
    products = []
    
    # Strategy 1: Light gaps found — split by gaps
    if len(h_gaps) >= 1 or len(v_gaps) >= 1:
        cells = split_by_gaps(img, gray, h_gaps, v_gaps)
        if len(cells) >= 2:
            for idx, bbox in enumerate(cells):
                cropped = smart_crop(img, gray, bbox)
                products.append({
                    'bbox': bbox,
                    'image': cropped,
                    'method': 'gap_split'
                })
            return products
    
    # Strategy 2: No gaps — single product, just trim margins
    x1, y1, x2, y2 = find_content_bbox(gray)
    cropped = smart_crop(img, gray, (x1, y1, x2, y2))
    products.append({
        'bbox': (x1, y1, x2, y2),
        'image': cropped,
        'method': 'margin_trim'
    })
    return products


def main():
    files = sorted([f for f in os.listdir(INPUT_DIR) if f.endswith('.png')])
    print(f"Processing {len(files)} pages...\n")
    
    product_count = 0
    stats = {'margin_trim': 0, 'gap_split': 0}
    
    for i, fname in enumerate(files):
        page_num = int(fname.split('_')[1].split('.')[0])
        img_path = os.path.join(INPUT_DIR, fname)
        
        products = process_page(page_num, img_path)
        
        for pidx, prod in enumerate(products):
            product_count += 1
            method = prod['method']
            stats[method] = stats.get(method, 0) + 1
            
            out_name = f'page{page_num:03d}_product{pidx + 1:02d}.png'
            out_path = os.path.join(OUTPUT_DIR, out_name)
            cv2.imwrite(out_path, prod['image'])
            
            MANIFEST.append({
                'source_page': page_num,
                'product_index': pidx + 1,
                'filename': out_name,
                'method': method,
                'width': prod['image'].shape[1],
                'height': prod['image'].shape[0],
            })
        
        method_str = products[0]['method']
        print(f"  [{i + 1}/{len(files)}] page_{page_num:03d} -> {len(products)} product(s) ({method_str})")
    
    manifest_path = os.path.join(OUTPUT_DIR, 'manifest.json')
    with open(manifest_path, 'w') as f:
        json.dump(MANIFEST, f, indent=2)
    
    print(f"\n{'='*50}")
    print(f"Done! {product_count} product images from {len(files)} pages")
    print(f"Output: {OUTPUT_DIR}")
    for method, count in stats.items():
        print(f"  {method}: {count}")


if __name__ == '__main__':
    main()
