commitID=`git log --pretty=oneline | head -n 1 | cut -b 1-12`

rm -rf ./dist/*

if [ ! -d "./dist" ]; then
  mkdir ./dist
fi

# browserify src/main.js | uglifyjs > "dist/main-$commitID.min.js"
browserify src/main.js > "dist/main-$commitID.min.js"

cp ./index.html ./dist/

sed -e "s/<!-- MAIN_SCRIPT -->/<script src=\".\/main-${commitID}.min.js\"><\/script>/g" index.html > ./dist/index.html

echo "build completed"
