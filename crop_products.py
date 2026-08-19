"""
Smart crop Westhome catalogue pages into individual e-commerce product images.
Strategy:
  1. Trim white/empty margins from each page
  2. Detect grid separators (lines/gaps) to split multi-product pages
  3. For single-product pages, just trim margins and add white padding
  4. Output each product as a separate PNG with consistent white background
"""
import cv2
import numpy as np
from PIL import Image
import os
import json

INPUT_DIR = 'C:/Users/Lenovo/Desktop/freebuff/westhome/split_images'
OUTPUT_DIR = 'C:/Users/Lenovo/Desktop/freebuff/westhome/product_images'
MANIFEST = []

os.makedirs(OUTPUT_DIR, exist_ok=True)


def find_grid_lines(gray, min_span_frac=0.3):
    """Find horizontal and vertical grid lines in the image."""
    h, w = gray.shape

    # --- Horizontal lines ---
    hline_rows = []
    for y in range(h):
        dark_count = np.sum(gray[y, :] < 180)
        if dark_count > w * min_span_frac:
            hline_rows.append(y)

    # Cluster consecutive rows
    hlines = []
    if hline_rows:
        groups = np.split(hline_rows, np.where(np.diff(hline_rows) > 5)[0] + 1)
        for g in groups:
            hlines.append(int(np.mean(g)))

    # --- Vertical lines ---
    vline_cols = []
    for x in range(w):
        dark_count = np.sum(gray[:, x] < 180)
        if dark_count > h * min_span_frac:
            vline_cols.append(x)

    vlines = []
    if vline_cols:
        groups = np.split(vline_cols, np.where(np.diff(vline_cols) > 5)[0] + 1)
        for g in groups:
            vlines.append(int(np.mean(g)))

    return hlines, vlines


def find_content_bbox(gray, threshold=248):
    """Find bounding box of non-white content."""
    h, w = gray.shape
    content = gray < threshold

    rows = np.where(content.any(axis=1))[0]
    cols = np.where(content.any(axis=0))[0]

    if len(rows) == 0 or len(cols) == 0:
        return 0, 0, w, h

    return int(cols[0]), int(rows[0]), int(cols[-1]), int(rows[-1])


def find_content_blocks(gray, threshold=248, min_block_area=5000):
    """Find rectangular blocks of content using connected components."""
    h, w = gray.shape

    # Binary: content vs white
    _, binary = cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY_INV)

    # Slight dilate to connect nearby content
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (10, 10))
    dilated = cv2.dilate(binary, kernel, iterations=2)

    # Find contours
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    blocks = []
    for c in contours:
        x, y, cw, ch = cv2.boundingRect(c)
        if cw * ch > min_block_area and cw > 80 and ch > 80:
            blocks.append((x, y, cw, ch))

    return blocks


def split_by_grid(img, gray, hlines, vlines, padding=10):
    """Split image using detected grid lines into individual product cells."""
    h, w = gray.shape

    # Build boundaries
    h_bounds = [0] + hlines + [h]
    v_bounds = [0] + vlines + [w]

    products = []
    for i in range(len(h_bounds) - 1):
        for j in range(len(v_bounds) - 1):
            y1 = max(0, h_bounds[i] - padding)
            y2 = min(h, h_bounds[i + 1] + padding)
            x1 = max(0, v_bounds[j] - padding)
            x2 = min(w, v_bounds[j + 1] + padding)

            cell = gray[y1:y2, x1:x2]
            # Skip cells that are mostly white
            if np.mean(cell) > 250:
                continue
            # Skip tiny cells
            if (y2 - y1) < 100 or (x2 - x1) < 100:
                continue

            products.append((x1, y1, x2, y2))

    return products


def trim_and_pad(img, bbox, target_size=None, padding_pct=0.05):
    """Trim to bbox and add white padding. Optionally resize to target."""
    x1, y1, x2, y2 = bbox
    h, w = img.shape[:2]

    # Add padding
    pad_x = int((x2 - x1) * padding_pct)
    pad_y = int((y2 - y1) * padding_pct)
    x1 = max(0, x1 - pad_x)
    y1 = max(0, y1 - pad_y)
    x2 = min(w, x2 + pad_x)
    y2 = min(h, y2 + pad_y)

    cropped = img[y1:y2, x1:x2].copy()

    if target_size:
        tw, th = target_size
        # Create white canvas
        canvas = np.ones((th, tw, 3), dtype=np.uint8) * 255
        # Resize crop to fit
        ch, cw = cropped.shape[:2]
        scale = min(tw / cw, th / ch) * 0.9  # 90% fill with margin
        new_w = int(cw * scale)
        new_h = int(ch * scale)
        resized = cv2.resize(cropped, (new_w, new_h), interpolation=cv2.INTER_AREA)
        # Center on canvas
        ox = (tw - new_w) // 2
        oy = (th - new_h) // 2
        canvas[oy:oy + new_h, ox:ox + new_w] = resized
        return canvas

    return cropped


def detect_page_type(img, gray):
    """Detect what kind of page this is."""
    h, w = gray.shape
    total_area = h * w

    # Check margins
    x1, y1, x2, y2 = find_content_bbox(gray)
    content_w = x2 - x1
    content_h = y2 - y1
    content_area = content_w * content_h

    margin_ratio = 1 - (content_area / total_area)

    # Check if it's a full-page image (very little margin, mostly non-white)
    avg_brightness = np.mean(gray)

    return {
        'content_bbox': (x1, y1, x2, y2),
        'margin_ratio': margin_ratio,
        'avg_brightness': avg_brightness,
        'is_dark': avg_brightness < 160,
        'has_significant_margins': margin_ratio > 0.05,
    }


def process_page(page_num, img_path):
    """Process a single page and extract product images."""
    img = cv2.imread(img_path)
    if img is None:
        return []

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape

    page_info = detect_page_type(img, gray)
    hlines, vlines = find_grid_lines(gray)

    products = []

    # Strategy 1: Grid lines found — split by grid
    if len(hlines) > 0 and len(vlines) > 0:
        cells = split_by_grid(img, gray, hlines, vlines)
        if len(cells) > 1:
            for idx, (x1, y1, x2, y2) in enumerate(cells):
                cropped = trim_and_pad(img, (x1, y1, x2, y2))
                products.append({
                    'bbox': (x1, y1, x2, y2),
                    'image': cropped,
                    'method': 'grid_split'
                })
            return products

    # Strategy 2: Content blocks detected
    blocks = find_content_blocks(gray)
    if len(blocks) > 1:
        # Filter overlapping blocks
        blocks.sort(key=lambda b: b[2] * b[3], reverse=True)
        filtered = []
        for b in blocks:
            bx, by, bw, bh = b
            overlap = False
            for fb in filtered:
                fx, fy, fw, fh = fb
                # Check overlap
                ox1 = max(bx, fx)
                oy1 = max(by, fy)
                ox2 = min(bx + bw, fx + fw)
                oy2 = min(by + bh, fy + fh)
                if ox2 > ox1 and oy2 > oy1:
                    overlap_area = (ox2 - ox1) * (oy2 - oy1)
                    if overlap_area > min(bw * bh, fw * fh) * 0.3:
                        overlap = True
                        break
            if not overlap:
                filtered.append(b)

        if len(filtered) > 1:
            for idx, (bx, by, bw, bh) in enumerate(filtered):
                cropped = trim_and_pad(img, (bx, by, bx + bw, by + bh))
                products.append({
                    'bbox': (bx, by, bx + bw, by + bh),
                    'image': cropped,
                    'method': 'block_detect'
                })
            return products

    # Strategy 3: Single product — trim margins
    x1, y1, x2, y2 = page_info['content_bbox']
    cropped = trim_and_pad(img, (x1, y1, x2, y2))
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
    stats = {'margin_trim': 0, 'block_detect': 0, 'grid_split': 0}

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

        print(f"  [{i + 1}/{len(files)}] page_{page_num:03d} -> {len(products)} product(s) ({products[0]['method']})")

    # Save manifest
    manifest_path = os.path.join(OUTPUT_DIR, 'manifest.json')
    with open(manifest_path, 'w') as f:
        json.dump(MANIFEST, f, indent=2)

    print(f"\n{'='*50}")
    print(f"Done! {product_count} product images extracted from {len(files)} pages")
    print(f"Output: {OUTPUT_DIR}")
    print(f"Methods used:")
    for method, count in stats.items():
        print(f"  {method}: {count}")
    print(f"Manifest: {manifest_path}")


if __name__ == '__main__':
    main()
