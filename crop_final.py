"""
Final e-commerce product crop for Westhome catalogue.
Strategy:
  1. Trim white margins from each page
  2. Analyze sub-regions within the content area to detect multi-product pages
  3. For multi-product pages, split using edge/brightness analysis
  4. Output clean product images with white border
"""
import cv2
import numpy as np
import os
import json

INPUT_DIR = 'C:/Users/Lenovo/Desktop/freebuff/westhome/split_images'
OUTPUT_DIR = 'C:/Users/Lenovo/Desktop/freebuff/westhome/product_images'
os.makedirs(OUTPUT_DIR, exist_ok=True)
MANIFEST = []


def trim_margins(gray, threshold=248, margin_buffer=5):
    """Find content area by trimming white margins."""
    h, w = gray.shape
    content = gray < threshold
    rows = np.where(content.any(axis=1))[0]
    cols = np.where(content.any(axis=0))[0]
    if len(rows) == 0 or len(cols) == 0:
        return 0, 0, w, h
    
    # Add small buffer
    y1 = max(0, rows[0] - margin_buffer)
    y2 = min(h, rows[-1] + margin_buffer)
    x1 = max(0, cols[0] - margin_buffer)
    x2 = min(w, cols[-1] + margin_buffer)
    return x1, y1, x2, y2


def detect_sub_products(gray, bbox):
    """
    Detect if a trimmed page contains multiple product regions.
    Uses edge density analysis to find horizontal/vertical split points.
    """
    x1, y1, x2, y2 = bbox
    h, w = gray.shape
    content_h = y2 - y1
    content_w = x2 - x1
    
    # Only attempt splitting on larger pages
    if content_h < 300 or content_w < 300:
        return None
    
    region = gray[y1:y2, x1:x2]
    
    # Look for horizontal transitions using local variance
    # High variance = product image area, low variance = separator or text area
    band_height = 10
    row_scores = []
    for y in range(0, content_h - band_height, band_height):
        band = region[y:y + band_height, :]
        # Score = local standard deviation
        score = np.std(band)
        row_scores.append((y, score))
    
    row_scores_arr = np.array([s[1] for s in row_scores])
    
    # Find rows with LOW variance (potential separators)
    if len(row_scores_arr) < 5:
        return None
    
    # Smooth the scores
    kernel_size = min(5, len(row_scores_arr) // 3)
    if kernel_size >= 3:
        kernel = np.ones(kernel_size) / kernel_size
        smoothed = np.convolve(row_scores_arr, kernel, mode='same')
    else:
        smoothed = row_scores_arr
    
    # Find valleys (low variance regions that could be separators)
    mean_score = np.mean(smoothed)
    std_score = np.std(smoothed)
    threshold = mean_score - 0.5 * std_score
    
    separator_rows = []
    in_valley = False
    valley_start = 0
    
    for i, score in enumerate(smoothed):
        if score < threshold and not in_valley:
            in_valley = True
            valley_start = i
        elif score >= threshold and in_valley:
            in_valley = False
            valley_width = i - valley_start
            if 2 <= valley_width <= 8:  # Narrow valley = potential separator
                separator_rows.append(row_scores[valley_start + valley_width // 2][0] + y1)
    
    # Similarly for vertical
    col_scores = []
    for x in range(0, content_w - band_height, band_height):
        band = region[:, x:x + band_height]
        score = np.std(band)
        col_scores.append(score)
    
    col_scores_arr = np.array(col_scores)
    if kernel_size >= 3 and len(col_scores_arr) > kernel_size:
        smoothed_col = np.convolve(col_scores_arr, kernel, mode='same')
    else:
        smoothed_col = col_scores_arr
    
    mean_col = np.mean(smoothed_col)
    std_col = np.std(smoothed_col)
    threshold_col = mean_col - 0.5 * std_col
    
    separator_cols = []
    in_valley = False
    for i, score in enumerate(smoothed_col):
        if score < threshold_col and not in_valley:
            in_valley = True
            valley_start = i
        elif score >= threshold_col and in_valley:
            in_valley = False
            valley_width = i - valley_start
            if 2 <= valley_width <= 8:
                separator_cols.append(valley_start * band_height + valley_width // 2 * band_height + x1)
    
    return {
        'h_separators': separator_rows,
        'v_separators': separator_cols,
    }


def add_white_border(img, border_pct=0.03):
    """Add a clean white border around the image."""
    h, w = img.shape[:2]
    border_x = max(10, int(w * border_pct))
    border_y = max(10, int(h * border_pct))
    
    canvas = np.ones((h + 2 * border_y, w + 2 * border_x, 3), dtype=np.uint8) * 255
    canvas[border_y:border_y + h, border_x:border_x + w] = img
    return canvas


def process_page(page_num, img_path):
    """Process a single page."""
    img = cv2.imread(img_path)
    if img is None:
        return []
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    
    # Step 1: Trim white margins
    x1, y1, x2, y2 = trim_margins(gray)
    content_w = x2 - x1
    content_h = y2 - y1
    
    products = []
    
    # Step 2: Check for sub-products (only on portrait pages with enough content)
    if content_h > 400 and content_w > 300:
        sub = detect_sub_products(gray, (x1, y1, x2, y2))
        if sub and len(sub['h_separators']) >= 1:
            # Split by horizontal separators
            h_bounds = [y1] + sub['h_separators'] + [y2]
            for i in range(len(h_bounds) - 1):
                sy1 = h_bounds[i]
                sy2 = h_bounds[i + 1]
                if (sy2 - sy1) < 50:
                    continue
                cropped = img[sy1:sy2, x1:x2].copy()
                cropped = add_white_border(cropped)
                products.append({
                    'image': cropped,
                    'method': 'h_split',
                    'bbox': (x1, sy1, x2, sy2)
                })
            
            if len(products) > 1:
                return products
            
        if sub and len(sub['v_separators']) >= 1:
            v_bounds = [x1] + sub['v_separators'] + [x2]
            for i in range(len(v_bounds) - 1):
                sx1 = v_bounds[i]
                sx2 = v_bounds[i + 1]
                if (sx2 - sx1) < 50:
                    continue
                cropped = img[y1:y2, sx1:sx2].copy()
                cropped = add_white_border(cropped)
                products.append({
                    'image': cropped,
                    'method': 'v_split',
                    'bbox': (sx1, y1, sx2, y2)
                })
            
            if len(products) > 1:
                return products
    
    # Step 3: Single product - trim and add border
    cropped = img[y1:y2, x1:x2].copy()
    cropped = add_white_border(cropped)
    products.append({
        'image': cropped,
        'method': 'margin_trim',
        'bbox': (x1, y1, x2, y2)
    })
    return products


def main():
    files = sorted([f for f in os.listdir(INPUT_DIR) if f.endswith('.png')])
    print(f"Processing {len(files)} pages...\n")
    
    product_count = 0
    stats = {}
    
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
            
            h_img, w_img = prod['image'].shape[:2]
            MANIFEST.append({
                'source_page': page_num,
                'product_index': pidx + 1,
                'filename': out_name,
                'method': method,
                'width': w_img,
                'height': h_img,
            })
        
        method_str = products[0]['method']
        count_str = f"{len(products)} product(s)" if len(products) > 1 else "1 product"
        print(f"  [{i + 1:3d}/{len(files)}] page_{page_num:03d} -> {count_str} ({method_str})")
    
    manifest_path = os.path.join(OUTPUT_DIR, 'manifest.json')
    with open(manifest_path, 'w') as f:
        json.dump(MANIFEST, f, indent=2)
    
    print(f"\n{'='*50}")
    print(f"Done! {product_count} product images from {len(files)} pages")
    print(f"Output: {OUTPUT_DIR}")
    print(f"Methods:")
    for method, count in sorted(stats.items(), key=lambda x: -x[1]):
        print(f"   {method}: {count}")
    print(f"Manifest: {manifest_path}")


if __name__ == '__main__':
    main()
