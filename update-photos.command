#!/bin/bash
# Двойной клик: пересобирает облегчённые копии фото (photo/web) и список js/photos.js по папке photo/
cd "$(dirname "$0")"
mkdir -p photo/web
echo "window.PHOTOS = [" > js/photos.js
ls photo | grep -iE '\.(jpe?g|png|webp|heic)$' | sort -V | while read f; do
  n="${f%.*}"
  sips -s format jpeg -s formatOptions 82 -Z 1000 "photo/$f" --out "photo/web/$n.jpg" >/dev/null 2>&1
  echo "  {\"src\":\"photo/web/$n.jpg\"}," >> js/photos.js
done
echo "];" >> js/photos.js
echo "Готово: $(grep -c src js/photos.js) фото"
