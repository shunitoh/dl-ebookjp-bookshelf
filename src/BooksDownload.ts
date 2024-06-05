import { chromium } from "@playwright/test";
import {
  bookCoverDirectory,
  bookInfoDirectory,
  booksDirectory,
  generateBookDirectory,
  imagesDirectory,
  isDownloadedBookName,
  writeJsonToFile,
} from "./BookShelfFileSystem";
import {
  BookInfo,
  BookShelfInfo,
  clickBook,
  clickBookShelf,
  clickDetailBookPage,
  clickSettingPage,
  createBookPDF,
  extractBookInfo,
  extractBookShelfInfo,
  goBackToBookShelf,
  is404,
  moveBookShelf,
  moveEBookJapan,
  moveFirstPage,
  returnBookShelf,
  scrollInBookShell,
  setDetailBookInfo,
  setNoReadAnimation,
} from "./PageController";

generateBookDirectory(imagesDirectory); // ダウンロードした画像を格納するディレクトリがなければ作成する
generateBookDirectory(booksDirectory); // PDFにした本を格納するディレクトリがなければ作成する
generateBookDirectory(bookCoverDirectory); // 表紙画像を格納するディレクトリがなければ作成する
generateBookDirectory(bookInfoDirectory); // 本の情報を格納するディレクトリがなければ作成する

const booksDownload = async (url) => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  let noReadAnimationFlg = false;
  await moveEBookJapan(page); //, expect);
  await page.waitForTimeout(3000);

  await page.goto(url);
  await page.waitForTimeout(3000);

  // 作品詳細ページをクリック
  await clickDetailBookPage(page);

  // 本の情報を抽出する
  let bookInfo: BookInfo = await extractBookInfo(page); // 作品情報を取得

    // 遷移後のページに特定の要素があるかチェック
    await page.waitForTimeout(3000);
    const errorPageCheck = await is404(page);
    if (errorPageCheck) {
      return;
    }
    // 本の詳細情報をセット
    bookInfo = await setDetailBookInfo(page, bookInfo); // 著者やタグをセット
    await clickBook(page);

    await writeJsonToFile(bookInfo, bookInfo.bookInfoJsonPath); // 本の情報をファイルに保存する
    console.log(
      `${bookInfo.bookTitle}\t${bookInfo.bookUrl}\t${bookInfo.lastPageNum}`,
    );

    // 作品設定ポップアップへ遷移
    await clickSettingPage(page);
    if (!noReadAnimationFlg) {
      await setNoReadAnimation(page);
      noReadAnimationFlg = true;
    }

    // 一番最初のページへ遷移
    await moveFirstPage(page);

    // ページをスクショで撮って、PDFを作成
    await createBookPDF(page, bookInfo);
};
