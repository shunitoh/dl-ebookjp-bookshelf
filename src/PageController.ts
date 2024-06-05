import { chromium } from "playwright";
import { expect, Expect, Page } from "@playwright/test";
import {
  bookCoverDirectory,
  bookInfoDirectory,
  booksDirectory,
  convertKanjiNumbersToArabic,
  convertZenkakuToHankaku,
  deleteFolder,
  extractMainTitle,
  generateBookDirectory,
  imagesDirectory,
  readJsonFile,
  yahooId,
  yahooPass,
} from "./BookShelfFileSystem";
import path from "path";
import fs from "fs";
import imgToPdf from "image-to-pdf";

// BookShelfInfo
export interface BookShelfInfo {
  filePath: string;
  totalBooks: number;
  downloaded?: number;
}

// BookInfo型の定義
export interface BookInfo {
  bookUrl: string; // 作品ページURLを取得
  bookTitle: string;
  bookName: string;
  booksDir: string;
  bookPageDir: string;
  firstPagePath: string;
  bookCoverImagePath: string;
  bookPDFPath: string;
  compressImagesDir: string;
  compressedImagesFilePath: string;
  bookInfoJsonPath?: string;
  authorInfo?: { [key: string]: string };
  tags?: string[];
  lastPageNum?: number;
}
// `${imagesDirectory}/${bookTitle}/${pageNum}.png`;
export const gotoBookShelf = async () => {
  const browser = await chromium.launch(); // Or 'firefox' or 'webkit'.
  const page = await browser.newPage();
  await page.goto("https://ebookjapan.yahoo.co.jp/bookshelf/");
  return page;
};
export const extractBookShelfInfo = async (page: Page) => {
  const totalBooksStr = await page
    .locator(".shelf-control__amount")
    .innerText();
  const totalBooks = totalBooksStr
    ? Number(totalBooksStr.replace(/,/, ""))
    : 2000;
  console.log(`本棚の書籍数: ${totalBooks}冊`);

  const filePath: string = path.resolve("./bookShelfInfo.json");
  let bookShelfInfo: BookShelfInfo = { filePath, totalBooks, downloaded: 0 };
  const bookShelfInfoFromFile = fs.existsSync(filePath)
    ? await readJsonFile(filePath)
    : null;
  if (bookShelfInfoFromFile)
    bookShelfInfo.downloaded = bookShelfInfoFromFile.downloaded;

  return bookShelfInfo;
};
export const goBackToBookShelf = async (
  page: Page,
  i: number,
  bookShelfInfo: BookShelfInfo,
) => {
  // 前のページに戻る
  // await page.goBack();
  await page.goto("https://ebookjapan.yahoo.co.jp/bookshelf/");
  await page.waitForTimeout(3000);
  await scrollInBookShell(page, bookShelfInfo);
  await clickBookShelf(page, i, bookShelfInfo);
  await page.getByRole("link", { name: "いますぐ読む" }).click();
};

export const is404 = async (page: Page) => {
  // 遷移後のページに特定の要素があるかチェック
  // const checked = (await page.$("div.heading.heading--error")) !== null;
  // 要素が存在するか確認
  const element = await page.$("h2.heading__main");
  // 要素が存在する場合、テキストを取得
  const textContent = element ? await page.textContent("h2.heading__main") : "";
  console.log(`is404 ${textContent}`)
  // console.log('is404: ', textContent)
  return textContent === "404";
};

export const isAdult = async (page: Page) => {
  // 要素が存在するかを確認
  await page.waitForTimeout(3000);
  if ((await page.locator("div.page-adult__question.adult-question > div > button:nth-child(1)").count()) > 0) {
    console.log('isAdult true')
    await page.locator("div.page-adult__question.adult-question > div > button:nth-child(1)").click();
  }
  console.log('isAdult false')
};

export const isNextButton = async (page: Page) => {
  let endText = "";
  // 要素が存在するかを確認
  if ((await page.locator(".next-book__title").count()) > 0) {
    endText = await page.locator(".next-book__title").innerText();
  }
  return endText === "続きはこちら";
};

export const isEndPage = async (page: Page) => {
  let endText = "";
  // 要素が存在するかを確認
  if ((await page.locator(".page-viewerlast__heading").count()) > 0) {
    endText = await page.locator(".page-viewerlast__heading").innerText();
  }
  return endText === "この作品はここまでです" || endText === "続きはこちら";
};

// 読み込みアニメーションをなしに設定
export const setNoReadAnimation = async (page: Page) => {
  await page.frameLocator('[id="__layout"] iframe').getByText("設定").click();
  await page
    .frameLocator('[id="__layout"] iframe')
    .getByRole("button", { name: "なし" })
    .click();
  await page
    .frameLocator('[id="__layout"] iframe')
    .locator(".close-circle > .icon")
    .click();
};

// ヤフーログイン＆ebookJapanへ移動
export const moveEBookJapan = async (page: Page /*, expect: Expect*/) => {
  // ebookJapanへユーザーでログイン
  await page.goto(
    "https://login.yahoo.co.jp/config/login?.done=https://ebookjapan.yahoo.co.jp/bookshelf/&.src=ebookjapan&verify_skip=1",
  );

  // メアドを入力
  await page
    .locator('[placeholder="ID\\/携帯電話番号\\/メールアドレス"]')
    .click();
  await page
    .locator('[placeholder="ID\\/携帯電話番号\\/メールアドレス"]')
    .fill(yahooId);
  await page.waitForTimeout(1000);
  await page
    .locator('[placeholder="ID\\/携帯電話番号\\/メールアドレス"]')
    .press("Enter");
  // await expect(page).toHaveURL(/src=ebookjapan&verify_skip=1/);
  await page.waitForLoadState("domcontentloaded");
  // await expect(page).toHaveURL('https://login.yahoo.co.jp/config/login?.done=https://ebookjapan.yahoo.co.jp/bookshelf/&.src=ebookjapan&verify_skip=1');

  // パスワードを入力
  await page.locator('[placeholder="パスワード"]').click();
  await page.locator('[placeholder="パスワード"]').fill(yahooPass);
  await page.waitForTimeout(1000);
  await page.locator('[placeholder="パスワード"]').press("Enter");
  // await expect(page).toHaveURL("https://ebookjapan.yahoo.co.jp/bookshelf/");
  await page.waitForLoadState("domcontentloaded");

  // 本棚へ繊維
  await page.locator('span:has-text("本棚")').click();

  // 本棚の表示を変更
  await page.waitForTimeout(3000);
  await page.locator("text=spine").click();
  await page.waitForTimeout(5000);
};

// 本棚へ移動
export const moveBookShelf = async (
  page: Page,
  bookShelfInfo: BookShelfInfo,
) => {
  await page.goto("https://ebookjapan.yahoo.co.jp/bookshelf/");
  await page.locator('span:has-text("本棚")').click();
  await page.waitForTimeout(3000);
  await page.getByText("spine").click();
  await page.waitForTimeout(3000);
  await scrollInBookShell(page, bookShelfInfo);
  await page.waitForTimeout(3000);
};

// 本棚へ戻る
export const returnBookShelf = async (page: Page) => {
  //await page.locator("i").filter({ hasText: "閉じる" }).click();
  //await page.locator("i").filter({ hasText: "閉じる" }).click();
  await page.click("div.modalbox__close > div > i");
  await page.waitForTimeout(3000);
};

// 本棚を順番にクリック
export const clickBookShelf = async (
  page: Page,
  pageNumber: number,
  bookShelfInfo: BookShelfInfo,
) => {
  // await page.getByRole('button', { name: '閉じる' }).click();
  await page.locator(`li:nth-child(${pageNumber}) > div > .book-item`).click();
  await page.waitForLoadState("domcontentloaded");
};

// 作品名を取得
export const getBookTitleByPage = async (page: Page) => {
  const bookTitle = await page
    .locator(".modalbox__body .heading__main")
    .innerText();
  return convertZenkakuToHankaku(bookTitle);
};

// 作品詳細ページへ遷移
export const clickDetailBookPage = async (page: Page) => {
  await page.getByRole("link", { name: "作品詳細を見る" }).click();
  await page.waitForLoadState("domcontentloaded");
  //await expect(page).toHaveURL(/\/books\//);
  await page.waitForTimeout(3000);
};

// 作品ページへ遷移
export const clickBook = async (page: Page) => {
  //await page.locator(".book-main__purchase > .btn").click();
  // await page.locator(".book-main__purchase > .btn").click();
  await page.locator(".contents-payment__actions.actions > .btn").click();
  //await page.locator('a').filter({ hasText: '読む' }).click();
  await page.waitForTimeout(3000);
};

export const clickPage = async (page: Page) => {
  await page
    .frameLocator('[id="__layout"] iframe')
    .locator("canvas")
    .click({
      position: {
        x: 26,
        y: 360,
      },
    });
};

export const clickSettingPage = async (page: Page) => {
  await page
    .frameLocator('[id="__layout"] iframe')
    .locator("canvas")
    .click({
      // 読み込みアニメーションをなしに設定
      position: {
        x: 511,
        y: 618,
      },
    });
  await page.waitForTimeout(3000);
};

export const scrollInBookShell = async (
  page: Page,
  bookShelfInfo: BookShelfInfo,
) => {
  const downCount: number =
    Math.ceil((bookShelfInfo.downloaded * 12) / 23) * 2 + 100;
  await avoidMachineBlock(page, downCount, 0, 3000);
};
// ページ数を取得
export const avoidMachineBlock = async (
  page: Page,
  downTime: number = 200,
  upTime: number = 200,
  waiting = 1000,
) => {
  for (let i = 0; i < downTime; i++) {
    await page.keyboard.press("ArrowDown");
    // await page.locator('body').press('ArrowDown');
  }
  await page.waitForTimeout(1000);
  for (let i = 0; i < upTime; i++) {
    await page.keyboard.press("ArrowUp");
    // await page.locator('body').press('ArrowUp');
  }
  await page.waitForTimeout(waiting);
};
// 一番最初のページへ遷移
export const moveFirstPage = async (page: Page) => {
  await page
    .frameLocator('[id="__layout"] iframe')
    .getByText("コンテンツ")
    .click();
  await page.frameLocator('[id="__layout"] iframe').getByText("表紙").click();
  await page
    .frameLocator('[id="__layout"] iframe')
    .locator("canvas")
    .click({
      position: {
        x: 511,
        y: 518,
      },
    });
};

export const extractBookInfo = async (page: any): Promise<BookInfo> => {
  const bookUrl = page.url(); // 作品ページURLを取得
  const bookTitle = convertKanjiNumbersToArabic(
    convertZenkakuToHankaku(await getBookTitleByPage(page)),
  );
  const bookName: string = extractMainTitle(bookTitle);
  const booksDir: string = `./${booksDirectory}/${bookName}`;
  const bookCoverImageDir: string = `./${bookCoverDirectory}/${bookName}`;
  const bookCoverImagePath = `${bookCoverDirectory}/${bookName}/${bookTitle}.jpeg`;
  const bookPageDir = `${imagesDirectory}/${bookTitle}`;
  const firstPagePath = `${imagesDirectory}/${bookTitle}/1.jpeg`;
  const bookPDFPath = `${booksDir}/${bookTitle}.pdf`;
  const compressImagesDir = `${imagesDirectory}/${bookTitle}`;
  const compressedImagesFilePath = `${imagesDirectory}/${bookTitle}.zip`;
  const bookInfoJsonPath = `${bookInfoDirectory}/${bookName}/${bookTitle}.json`;
  const bookInfoDir = `${bookInfoDirectory}/${bookName}`;
  generateBookDirectory(booksDir);
  generateBookDirectory(bookInfoDir);
  generateBookDirectory(bookCoverImageDir);
  console.log(`bookTitle: ${bookTitle}`);
  return {
    bookUrl,
    bookTitle,
    bookName,
    booksDir,
    bookCoverImagePath,
    bookPageDir,
    firstPagePath,
    bookPDFPath,
    compressImagesDir,
    compressedImagesFilePath,
    bookInfoJsonPath,
    lastPageNum: 240,
  };
};

export const getImagePath = (bookInfo: BookInfo, pageNum: number) => {
  return `${bookInfo.bookPageDir}/${pageNum}.jpeg`;
};

// 本から著者情報やタグを抽出する関数
export const setDetailBookInfo = async (
  page: any,
  bookInfo: BookInfo,
): Promise<BookInfo> => {
  // 著者情報を取得
  // const authorText = await page.textContent(".book-main__author");
  const authorText = await page.textContent(".contents-detail__author");
  const authorInfo = authorText
    .trim()
    .split("　") // 全角スペースで分割
    .map((part: string) => part.split("：")) // 各部分を「：」で分割
    .reduce(
      (obj: { [key: string]: string }, [key, value]) => {
        if (value) obj[key] = value; // キーと値をオブジェクトに追加
        if (!value) obj["MEMO"] = key;
        return obj;
      },
      {} as { [key: string]: string },
    );
  console.log("authorInfo: ", JSON.stringify(authorInfo));

  // タグを取得
  const tags = await page.$$eval(".tag-list__item", (items: any) =>
    items.map((item: any) => item.textContent.trim()),
  );
  console.log("tags: ", JSON.stringify(tags));

  await avoidMachineBlock(page, 250, 250);

  let lastPageNum: number = 350;
  // const itemsText = await page.textContent(".product-detail__item");
  // const itemsText = await page.textContent(".detail-item__detail detail > span > .detail__text");
  const itemsCount = await page.locator(".page-book")
      .locator(".contents-detail__product")
      .locator(".product-detail__item")
      .locator("dd")
      .getByText(/ページ$/)
      .count();
  if (itemsCount > 0) {
    // 本の総ページ数を取得
    const lastPageNumStr =
      (await page
        .locator(".page-book")
        .locator(".contents-detail__product")
        .locator(".product-detail__item")
        .locator("dd")
        .getByText(/ページ/)
        .innerText()
        .catch((reason: any) => console.log(reason))) || "";
    lastPageNum = Number(lastPageNumStr.replace(/ページ/, "")) || 0;
  }

  // 抽出した著者情報とタグを含むオブジェクトを返す
  bookInfo.authorInfo = authorInfo;
  bookInfo.tags = tags;
  bookInfo.lastPageNum = lastPageNum;
  console.log(`bookInfo: ${JSON.stringify(bookInfo)}`);
  return bookInfo;
};

export const createBookPDF = async (page: Page, bookInfo: BookInfo) => {
  let bookPages: string[] = [];
  const screenShotPages = Math.ceil(bookInfo.lastPageNum / 2);
  for (let p = 1; p <= screenShotPages; p++) {
    // ページの読み込みに時間がかかって白紙みたいな時があるので、
    // １秒前後の画像サイズを比較して、一致しているかをチェック
    // また、1秒たっても両方画像が真っ白な時があるため、
    // その場合は白紙画像サイズを下回らないようにする
    if (await is404(page)) break;
    if (await isNextButton(page)) break;
    if (await isEndPage(page)) break;

    const imgPath = getImagePath(bookInfo, p);
    bookPages.push(imgPath);

    const emptyImagePageSize = 5338;
    let beforeImgSize = 0;
    let afterImgSize = 0;
    try {
      while (
        beforeImgSize * afterImgSize === 0 ||
        beforeImgSize !== afterImgSize ||
        afterImgSize <= emptyImagePageSize
      ) {
        await page.screenshot({ path: imgPath, type: "jpeg", quality: 100 });
        const beforeImgStat = fs.statSync(imgPath);
        beforeImgSize = beforeImgStat.size;
        await page.waitForTimeout(1000);
        await page.screenshot({ path: imgPath, type: "jpeg", quality: 100 });
        const afterImgStat = fs.statSync(imgPath);
        afterImgSize = afterImgStat.size;
      }
      if (p === 1) {
        await page.screenshot({
          path: bookInfo.bookCoverImagePath,
          clip: { x: 0, y: 0, width: 512, height: 720 },
          type: "jpeg",
          quality: 100,
        });
      }
      console.log(`pageNo.${p} / ${screenShotPages}`);
      await clickPage(page);
    } catch (e) {
      // 最終ページをすぎると、clickできなくなって例外になるので、そうなったら抜ける
    }
  }

  if (bookPages.length > 0) {
    try {
      await imgToPdf(bookPages, [841.89, 595.28]).pipe(
        fs.createWriteStream(path.resolve(bookInfo.bookPDFPath)),
      );
    } catch (e) {
      console.log(e);
    }
  }
  await deleteFolder(path.resolve(bookInfo.compressImagesDir));
  // await zipAndDeleteFolder(path.resolve(bookInfo.compressImagesDir), path.resolve(bookInfo.compressedImagesFilePath));
};
