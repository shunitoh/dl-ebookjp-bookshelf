import * as fs from "fs";
import { test, expect } from "@playwright/test";
import {
  convertKanjiNumbersToArabic,
  convertZenkakuToHankaku,
  extractMainTitle,
  moveFile,
  zipAndDeleteFolder,
} from "../src/BookShelfFileSystem";
import path, { extname, join } from "path";

test.skip("各巻のタイトルからメインタイトルを抽出する", async () => {
  const downloadedBookNames = fs
    .readdirSync(path.resolve("./books"))
    .filter((file) => extname(file).toLowerCase() !== ".DS_Store");
  //.filter(file => extname(file).toLowerCase() === '.pdf')
  //.map(file => join(bookInfo.booksDir, file));
  let bookName: string = "";
  //downloadedBookNames.
  // await Promise.all(downloadedBookNames.map(bookTitle => async (bookTitle: string) => {
  for (const bookName of downloadedBookNames) {
    //console.log(bookName);
    if (bookName === ".DS_Store") continue;
    const bookFiles = fs
      .readdirSync(path.resolve(`./books/${bookName}`))
      .filter((file) => extname(file).toLowerCase() !== ".DS_Store");
    for (const file of bookFiles) {
      if (!/アホリズム/.test(file)) continue;
      const destName = extractMainTitle(
        convertKanjiNumbersToArabic(convertZenkakuToHankaku(bookName)),
      );
      const destTitle = convertKanjiNumbersToArabic(
        convertZenkakuToHankaku(file),
      );
      // console.log(`${title}  ->  ${name}`);
      console.log(
        `./books/${bookName}/${file}`,
        `./books/${destName}/${destTitle}`,
      );
      // await moveFile(`./books/${bookName}/${file}`, `./books/${destName}/${destTitle}`)
    }
  }
});
