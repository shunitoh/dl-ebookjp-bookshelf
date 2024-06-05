import * as fs from "fs";
import path from "path";
import imgToPdf from "image-to-pdf";
import { test, expect } from "@playwright/test";
import {
  bookCoverDirectory,
  bookInfoDirectory,
  booksDirectory,
  deleteFolder,
  generateBookDirectory,
  imagesDirectory,
  isDownloadedBookName,
  readJsonFile,
  writeJsonToFile,
  yahooId,
  yahooPass,
  zipAndDeleteFolder,
} from "../src/BookShelfFileSystem";
import {
  avoidMachineBlock,
  BookInfo,
  BookShelfInfo,
  clickBook,
  clickBookShelf,
  clickDetailBookPage,
  clickPage,
  clickSettingPage,
  createBookPDF,
  extractBookInfo,
  extractBookShelfInfo,
  getImagePath,
  goBackToBookShelf,
  is404, isAdult,
  moveBookShelf,
  moveEBookJapan,
  moveFirstPage,
  returnBookShelf,
  scrollInBookShell,
  setDetailBookInfo,
  setNoReadAnimation,
} from "../src/PageController";

generateBookDirectory(imagesDirectory); // ダウンロードした画像を格納するディレクトリがなければ作成する
generateBookDirectory(booksDirectory); // PDFにした本を格納するディレクトリがなければ作成する
generateBookDirectory(bookCoverDirectory); // 表紙画像を格納するディレクトリがなければ作成する
generateBookDirectory(bookInfoDirectory); // 本の情報を格納するディレクトリがなければ作成する

test("test", async ({ page }) => {
  test.setTimeout(0);
  await page.waitForTimeout(3000);
  let noReadAnimationFlg = false;
  await moveEBookJapan(page); //, expect);

  // 本棚の情報を抽出する
  let bookShelfInfo: BookShelfInfo = await extractBookShelfInfo(page);

  // 本棚から取り出す番号を取得する
  const bookNum = bookShelfInfo.downloaded ? bookShelfInfo.downloaded : 1;

  // 対象の本が表示されるまで、本棚をスクロールする
  await scrollInBookShell(page, bookShelfInfo);

  // 本棚にある本を1冊ずつ開いてキャプチャ
  for (let i = bookNum; i < bookShelfInfo.totalBooks; i++) {
    console.log(`------------------------${i}-------------------------`);
    // 本棚の本をクリック
    await clickBookShelf(page, i, bookShelfInfo);

    // 本の情報を抽出する
    let bookInfo: BookInfo = await extractBookInfo(page); // 作品情報を取得
    if (isDownloadedBookName(bookInfo)) {
      // 既にダウンロード済みのものはスキップ
      await returnBookShelf(page);
      continue;
    }

    // 作品詳細ページをクリック
    await clickDetailBookPage(page);
    await isAdult(page);

    // 遷移後のページに特定の要素があるかチェック
    await page.waitForTimeout(3000);
    const errorPageCheck = await is404(page);
    if (errorPageCheck) {
      console.log(`errorPageCheck: ${errorPageCheck}`)
      await goBackToBookShelf(page, i, bookShelfInfo);
    } else {
      try {
        // 本の詳細情報をセット
        bookInfo = await setDetailBookInfo(page, bookInfo); // 著者やタグをセット
        await clickBook(page);
      } catch (e) {
        await goBackToBookShelf(page, i, bookShelfInfo);
      }
    }
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

    bookShelfInfo.downloaded = i;
    await writeJsonToFile(bookShelfInfo, bookShelfInfo.filePath);

    await moveBookShelf(page, bookShelfInfo);
  }
});
