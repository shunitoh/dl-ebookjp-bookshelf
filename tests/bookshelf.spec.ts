import {chromium} from "@playwright/test";
import * as fs  from 'fs';

const { test, expect } = require('@playwright/test');

// TODO: 自分のヤフーアカウントを入力
// ヤフーアカウント
const yahooAccount = '';

// パスワード
const password = '';

// ダウンロードした本を格納するディレクトリがなければ作成する
const downloadedDirectory = 'images'
if (!fs.existsSync(downloadedDirectory)) {
  fs.mkdirSync(downloadedDirectory);
  console.log(`${downloadedDirectory}ディレクトリを作成しました`)
}

// 読み込みアニメーションをなしに設定
const setNoReadAnimation = async (page) => {
  await page.frameLocator('[id="__layout"] iframe').locator('text=設定').click();
  await page.frameLocator('[id="__layout"] iframe').locator('text=なし').click();
  await page.frameLocator('[id="__layout"] iframe').locator('.close-circle > .icon').click();
}

// ダウンロード済の本かどうかをチェック
const downloadedBookNames = fs.readdirSync(downloadedDirectory);
console.log('downloadedBookNames:', downloadedBookNames);
const isDownloaded = (bookName) => {
  const result = downloadedBookNames.includes(bookName);
  if(!result) return result;
  console.log(` "${bookName}" is downloaded.`);
  return result;
}

// ヤフーログイン＆ebookJapanへ移動
const moveEBookJapan = async (page) => {
  // ebookJapanへユーザーでログイン
  await page.goto('https://login.yahoo.co.jp/config/login?.done=https://ebookjapan.yahoo.co.jp/bookshelf/&.src=ebookjapan&verify_skip=1');

  // メアドを入力
  await page.locator('[placeholder="ID\\/携帯電話番号\\/メールアドレス"]').click();
  await page.locator('[placeholder="ID\\/携帯電話番号\\/メールアドレス"]').fill(yahooAccount);
  await page.waitForTimeout(1000);
  await page.locator('[placeholder="ID\\/携帯電話番号\\/メールアドレス"]').press('Enter');
  await expect(page).toHaveURL('https://login.yahoo.co.jp/config/login?.done=https://ebookjapan.yahoo.co.jp/bookshelf/&.src=ebookjapan&verify_skip=1');

  // パスワードを入力
  await page.locator('[placeholder="パスワード"]').click();
  await page.locator('[placeholder="パスワード"]').fill(password);
  await page.waitForTimeout(1000);
  await page.locator('[placeholder="パスワード"]').press('Enter');
  await expect(page).toHaveURL('https://ebookjapan.yahoo.co.jp/bookshelf/')

  // 本棚へ繊維
  await page.locator('span:has-text("本棚")').click();

  // 本棚の表示を変更
  await page.locator('text=spine').click();
}

// 本棚へ移動
const moveBookShelf = async (page) => {
  await page.goto('https://ebookjapan.yahoo.co.jp/bookshelf/');
  await page.locator('span:has-text("本棚")').click();
  await page.locator('text=spine').click();
}

test('test', async ({ page }) => {
  test.setTimeout(12000000);
  let noReadAnimationFlg = false
  await chromium.launch({ devtools: true });
  await moveEBookJapan(page);

  // 本棚にある本を1冊ずつ開いてキャプチャ
  for(let i = 1; i < 3; i++) {
    // 本棚を順番にクリック
    await page.locator(`li:nth-child(${i}) > div > .book-item`).click();

    // 作品名を取得
    const title = await page.locator('.modalbox__body .heading__main').innerText();

    // 既にダウンロード済みのものはスキップ
    if(isDownloaded(title)) {
      await moveBookShelf(page);
      continue;
    }

    // 作品詳細ページへ遷移
    await page.locator('text=作品詳細を見る').click();
    const url = await page.url();
    await expect(page).toHaveURL(url);

    // ページ数を取得
    const lastPageNumStr = await page.locator('.contents-detail__product .detail__text').locator('text=/.*ページ/').innerText();
    const lastPageNum = lastPageNumStr.replace(/ページ/, '');
    console.log(`lastPageNum: ${lastPageNum}`)

    // 作品ページへ遷移
    await page.locator('.book-main__purchase > .btn').click();
    await page.waitForTimeout(3000);
    const detailUrl = await page.url();
    await expect(page).toHaveURL(detailUrl);
    console.log(`${title}\t${url}`);

    // 読み込みアニメーションをなしに設定
    await page.waitForTimeout(3000);
    await page.frameLocator('[id="__layout"] iframe').locator('canvas').click({
      position: {
        x: 511,
        y: 618
      }
    })
    if(! noReadAnimationFlg) {
      await setNoReadAnimation(page);
      noReadAnimationFlg = true;
    }

    // 一番最初のページへ遷移
    await page.frameLocator('[id="__layout"] iframe').locator('text=コンテンツメニュー').click();
    await page.frameLocator('[id="__layout"] iframe').locator('text=表紙').click();
    await page.frameLocator('[id="__layout"] iframe').locator('canvas').click({
      position: {
        x: 511,
        y: 518
      }
    });

    const screenShotPages = Math.round(lastPageNum / 2);
    try {
      for(let p = 1; p < screenShotPages;  p++) {
        await page.frameLocator('[id="__layout"] iframe').locator('canvas').click({
          position: {
            x: 26,
            y: 360
          }
        });

        // ページの読み込みに時間がかかって白紙みたいな時があるので、
        // １秒前後の画像サイズを比較して、一致しているかをチェック
        // また、1秒たっても両方画像が真っ白な時があるため、
        // その場合は白紙画像サイズを下回らないようにする
        const imgPath = `images/${title}/${p}.png`;
        const emptyImagePageSize = 5338;
        let beforeImgSize = 0;
        let afterImgSize = 0;
        while((beforeImgSize * afterImgSize) === 0 || beforeImgSize !== afterImgSize || afterImgSize <= emptyImagePageSize) {
          await page.screenshot({path: imgPath});
          const beforeImgStat = fs.statSync(imgPath);
          beforeImgSize = beforeImgStat.size;
          await page.waitForTimeout(1000);
          await page.screenshot({path: imgPath});
          const afterImgStat = fs.statSync(imgPath);
          afterImgSize = afterImgStat.size;
          // console.log(`before: ${beforeImgSize} after: ${afterImgSize} result: ${beforeImgSize === afterImgSize}`)
        }
        console.log(`pageNo.${p}`)
      }
    }catch(e){
      // 最終ページをすぎると、clickできなくなって例外になるので、そうなったら抜ける
    }

    await moveBookShelf(page);
  }
});
