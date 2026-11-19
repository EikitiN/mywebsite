import json
from pathlib import Path
from bs4 import BeautifulSoup

def main():
    input_path = Path('./sample')
    output_path = Path('./search-index.json')
    html_files = sorted(input_dir.glob("*.html"))

    for html_file in html_files:
        #htmlタグを取り除いた、表示される文字列部分のみのテキストにする。
        

if __name__ == "__main__":
    main()