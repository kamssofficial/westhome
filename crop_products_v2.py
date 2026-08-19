"""
Smart crop Westhome catalogue pages into individual e-commerce product images.
V2: Only uses full-span grid lines (80%+ of page width/height) as separators.
"""
import cv2
import numpy as np
import os
import json

INPUT_DIR = 'C:/Users/Lenovo/Desktop/freebuff/westhome/split_images'
OUTPUT_DIR = 'C:/Users/Lenovo/Desktop/freebuff/westhome/product_images'
os.makedirs(OUTPUT_DIR, exist_ok=True)

MANIFEST = []


def find_grid_lines(gray, min_span_frac=0.75):
    """Find horizontal and vertical grid lines that span most of the page."""
    h, w = gray.shape

    # --- Horizontal lines: must span 75%+ of width ---
    hlines = []
    for y in range(h):
        dark_count = np.sum(gray[y, :] < 160)
        if dark_count > w * min_span_frac:
            hlines.append(y)

    # Cluster consecutive rows
    h_clusters = []
    if hlines:
        groups = np.split(hlines, np.where(np.diff(hlines) > 3)[0] + 1)
        for g in groups:
            h_clusters.append(int(np.mean(g)))

    # Merge lines that are too close (< 60px apart — likely same separator region)
    h_merged = []
    for line in h_clusters:
        if not h_merged or line - h_merged[-1] > 60:
            h_merged.append(line)
        else:
            h_merged[-1] = (h_merged[-1] + line) // 2

    # --- Vertical lines: must span 75%+ of height ---
    vlines = []
    for x in range(w):
        dark_count = np.sum(gray[:, x] < 160)
        if dark_count > h * min_span_frac:
            vlines.append(x)

    v_clusters = []
    if vlines:
        groups = np.split(vlines, np.where(np.diff(vlines) > 3)[0] + 1)
        for g in groups:
            v_clusters.append(int(np.mean(g)))

    v_merged = []
    for line in v_clusters:
        if not v_merged or line - v_merged[-1] > 60:
            v_merged.append(line)
        else:
            v_merged[-1] = (v_merged[-1] + line) // 2

    return h_merged, v_merged


def find_content_bbox(gray, threshold=248):
    """Find bounding box of non-white content."""
    h, w = gray.shape
    content = gray < threshold
    rows = np.where(content.any(axis=1))[0]
    cols = np.where(content.any(axis=0))[0]
    if len(rows) == 0 or len(cols) == 0:
        return 0, 0, w, h
    return int(cols[0]), int(rows[0]), int(cols[-1]), int(rows[-1])


def split_by_grid(img, gray, hlines, vlines, margin=8):
    """Split image using full-span grid lines into individual product cells."""
    h, w = gray.shape

    h_bounds = [0] + hlines + [h]
    v_bounds = [0] + vlines + [w]

    products = []
    for i in range(len(h_bounds) - 1):
        for j in range(len(v_bounds) - 1):
            y1 = h_bounds[i]
            y2 = h_bounds[i + 1]
            x1 = v_bounds[j]
            x2 = v_bounds[j + 1]

            # Skip too-small cells
            cell_w = x2 - x1
            cell_h = y2 - y1
            if cell_w < 80 or cell_h < 80:
                continue

            # Check if cell has meaningful content (not just margin)
            cell_gray = gray[y1:y2, x1:x2]
            avg_brightness = np.mean(cell_gray)
            if avg_brightness > 252:  # almost pure white
                continue

            # Crop with small margin
            cy1 = max(0, y1 + margin)
            cy2 = min(h, y2 - margin)
            cx1 = max(0, x1 + margin)
            cx2 = min(w, x2 - margin)

            if cy2 > cy1 and cx2 > cx1:
                products.append((cx1, cy1, cx2, cy2))

    return products


def smart_crop(img, gray, bbox, padding_pct=0.03):
    """Crop to bounding box with optional padding."""
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

    hlines, vlines = find_grid_lines(gray)

    products = []

    # Strategy 1: Full-span grid lines found — split by grid
    if len(hlines) >= 1 or len(vlines) >= 1:
        cells = split_by_grid(img, gray, hlines, vlines)
        if len(cells) >= 2:
            for idx, bbox in enumerate(cells):
                cropped = smart_crop(img, gray, bbox)
                products.append({
                    'bbox': bbox,
                    'image': cropped,
                    'method': 'grid_split'
                })
            return products

    # Strategy 2: Single product — just trim margins
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
    stats = {'margin_trim': 0, 'grid_split': 0}

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
