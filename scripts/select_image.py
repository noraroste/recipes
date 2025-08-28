def check_image_attributes(img):
  src = img.get('src')
  if not src:
    return None, False
  img_class = ' '.join(img.get('class', []))
  if any(size in img_class.lower() for size in ['thumb', 'icon', 'small']):
    # print(f"Image {src} appears to be a thumbnail: {img_class}")
    return None, False
    # Make URL absolute if needed
  if not src.startswith(('http://', 'https://')):
      return None, False
  # Check if the image is likely a logo or avatar
  img_src = img.get('src', '').lower()
  img_alt = img.get('alt', '').lower()
  img_class = ' '.join(img.get('class', [])).lower()

  # Print debug info
  # print(f"Checking image - src: {img_src}")
  # print(f"alt: {img_alt}")
  # print(f"class: {img_class}")
  # Check for logo indicators in URL/filename, alt text, or class
  logo_indicators = ['logo', 'avatar', 'icon', 'logos', 'banner', 'header', 'footer', 'sponsor', 'menu', 'profile', 'search', 'close-mob', 'loading']
  if any(indicator in img_src or indicator in img_alt or indicator in img_class
         for indicator in logo_indicators):
    # print(f"Image {src} appears to be a logo or avatar")
    return None, False

  # print(f"Image {img} is returned as a candidate")
  return img,True


def check_rendered_image_size(img):
  # Check style attribute for dimensions
  style = img.get('style', '')
  src = img.get('src')
  if style:
    import re
    width_match = re.search(r'width\s*:\s*(\d+)px', style)
    height_match = re.search(r'height\s*:\s*(\d+)px', style)
    # print(f"Style attribute for image {src}: {width_match}, {height_match}")

    if width_match and height_match:
      width = int(width_match.group(1))
      height = int(height_match.group(1))
      # print(f"Image {src} has CSS dimensions: {width}x{height}")
      if width < 200 or height < 200:
        return None,False

  # Check width/height attributes
  width = img.get('width')
  height = img.get('height')

  if width and height:
    try:
      # Convert to integers if they're not percentages
      if not (str(width).endswith('%') or str(height).endswith('%')):
        width = int(width) if str(width).isdigit() else 0
        height = int(height) if str(height).isdigit() else 0
        # print(f"Image {src} has HTML dimensions: {width}x{height}")
        if width < 200 or height < 200:
          return None, False
    except ValueError:
      # print(f"Invalid dimensions for image {src}: width={width}, height={height}")
      return None, False
  # print(f"Image {src} does not have valid dimensions")
  return src, True


def find_first_image(soup, url):
  # Images to check
  images = soup.find_all('img')
  print(f"Found {len(images)} images in main content")

  accepted_images = []
  # Filter images with unwanted attributes
  for img in images:
    src, is_accepted = check_image_attributes(img)
    if not src or not is_accepted:
      # print(f"Skipping image {src} due to attributes")
      continue
    if is_accepted and src:
      accepted_images.append(src)

  print(f"Accepted {len(accepted_images)} images after filtering")
  # Check each image for rendered size
  for img in accepted_images:
    img_url, is_large_enough = check_rendered_image_size(img)
    if img_url and is_large_enough:
      print(f"Found suitable image: {img_url}")
      return img_url

  print("No suitable images found")
  return None
