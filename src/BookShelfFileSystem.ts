import * as fs from "fs";
import { join, extname, dirname } from "path";
import * as dotenv from "dotenv";
import { rm } from "fs/promises";
import archiver from "archiver";
import { avoidMachineBlock, BookInfo } from "./PageController";

dotenv.config();
// TODO: 自分のヤフーアカウントを入力
export const yahooId = `${process.env.YAHOO_ID}`; // ヤフーアカウント
export const yahooPass = `${process.env.YAHOO_PASS}`; // パスワード
export const imagesDirectory = "images";
export const booksDirectory = "books";
export const bookCoverDirectory = "covers";
export const bookInfoDirectory = "info";

//console.log(`${yahooId}: ${yahooPass}`)
export const generateBookDirectory = (directory: string) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory);
    console.log(`${directory}ディレクトリを作成しました`);
  }
};

// ダウンロード済の本かどうかをチェック
export const isDownloadedBookName = (bookInfo: BookInfo) => {
  const downloadedBookNames = fs
    .readdirSync(bookInfo.booksDir)
    .filter((file) => extname(file).toLowerCase() === ".pdf")
    .map((file) => join(bookInfo.booksDir, file));
  console.log("downloadedBookNames:", downloadedBookNames);
  console.log(`books/${bookInfo.bookName}/${bookInfo.bookTitle}.pdf`);
  const result = downloadedBookNames.includes(
    `books/${bookInfo.bookName}/${bookInfo.bookTitle}.pdf`,
  );
  if (!result) return result;
  console.log(` "${bookInfo.bookTitle}" is downloaded.`);
  return result;
};

// ZIP圧縮を行う関数
const zipDirectory = async (source: string, out: string): Promise<void> => {
  const archive = archiver("zip", { zlib: { level: 9 } });
  const stream = fs.createWriteStream(out);

  return new Promise((resolve, reject) => {
    archive
      .directory(source, false)
      .on("error", (err) => reject(err))
      .pipe(stream);

    stream.on("close", () => resolve());
    archive.finalize();
  });
};

// ディレクトリを圧縮して削除する関数
export const zipAndDeleteFolder = async (
  directoryPath: string,
  zipPath: string,
): Promise<void> => {
  try {
    // ディレクトリをZIP圧縮
    await zipDirectory(directoryPath, zipPath);
    // console.log(`Directory ${directoryPath} has been zipped to ${zipPath}`);

    // ZIP圧縮後にディレクトリを削除
    await rm(directoryPath, { recursive: true, force: true });
    // console.log(`Directory ${directoryPath} has been removed`);
  } catch (err) {
    console.error("An error occurred:", err);
  }
};

export const deleteFolder = async (directoryPath: string): Promise<void> => {
  try {
    // ZIP圧縮後にディレクトリを削除
    await rm(directoryPath, { recursive: true, force: true });
    // console.log(`Directory ${directoryPath} has been removed`);
  } catch (err) {
    console.error("An error occurred:", err);
  }
};

export const writeJsonToFile = async (
  jsonObject: any,
  writeFilePath: string,
) => {
  try {
    // JSONを文字列に変換
    const jsonString = JSON.stringify(jsonObject, null, 2);

    // ファイルに非同期で書き込み
    await fs.promises.writeFile(writeFilePath, jsonString, "utf8");
    // console.log("ファイルが正常に書き込まれました。");
  } catch (err) {
    console.error("エラーが発生しました:", err);
  }
};

export const readJsonFile = async (filePath: string): Promise<any> => {
  try {
    const fileContent = await fs.promises.readFile(filePath, "utf-8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Error reading JSON file:", error);
    throw error;
  }
};

export const zenkakuToHankaku = (str: string): string => {
  return str
    .replace(/[０-９]/g, (s) => {
      return String.fromCharCode(s.charCodeAt(0) - 0xfee0);
    })
    .replace(/[（）]/g, (s) => {
      return s === "（" ? "(" : ")";
    });
};

export const extractMainTitle = (title: string): string => {
  // 全角数字と全角括弧を半角に変換
  title = zenkakuToHankaku(title);

  // 各パターンに基づいて巻数部分を除去
  title = title
    .replace(/\s*\（\d+）\.*$/, "") // 「（1）.pdf」を除去
    .replace(/\s*：\s*\d+.*$/, "") // 「： 1」を除去
    .replace(/\s+\d+$/, "") // 末尾の「 10」を除去
    .replace(/\s+\d+巻$/, "") // 「 1巻」を除去
    .replace(/\d+$/, "") // 末尾の「5」を除去
    .replace(/\(\d+\)$/, "") // 「(7)」を除去
    .replace(/(?<=\S)\s+\d+\s+/, "");

  return title.trim(); // トリムして余分な空白を除去
};

export const convertZenkakuToHankaku = (str: string): string => {
  // 全角括弧、全角空白、全角数字、全角記号を半角に変換
  return (
    str
      .replace(/[\uff08\uff09]/g, (s) => (s === "\uff08" ? "(" : ")")) // 全角括弧
      .replace(/\u3000/g, " ") // 全角空白
      .replace(/[０-９Ａ-Ｚａ-ｚ]/g, (s) =>
        String.fromCharCode(s.charCodeAt(0) - 0xfee0),
      ) // 全角数字と全角英字
      .replace(/[\'\"\$\`\\[\]]/g, "-")
      .replace(/[\/]/g, " ")
      //.replace(/[！-／：-＠［-｀｛-～、-〜]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)) // 全角記号
      .trim()
  ); // 末尾の空白を除去
};

// ファイルを移動する関数
export const moveFile = async (
  srcPath: string,
  destPath: string,
): Promise<void> => {
  // 移動元と移動先が同じ場合は何もしない
  if (srcPath === destPath) {
    console.log("Source and destination are the same. Skipping move.");
    return;
  }

  try {
    // 移動先のディレクトリを取得
    const destDir = dirname(destPath);

    // 移動先のディレクトリが存在しない場合は作成
    try {
      await fs.promises.access(destDir);
    } catch (error) {
      await fs.promises.mkdir(destDir, { recursive: true });
    }

    // ファイルを移動
    await fs.promises.rename(srcPath, destPath);
    console.log("File moved successfully");
  } catch (error) {
    console.error("Error moving file:", error);
    throw error; // エラーを呼び出し元に伝播させる
  }
};

export const convertKanjiNumbersToArabic = (str: string): string => {
  const kanjiDigits: { [key: string]: string } = {
    一: "1",
    二: "2",
    三: "3",
    四: "4",
    五: "5",
    六: "6",
    七: "7",
    八: "8",
    九: "9",
    壱: "1",
    弐: "2",
    参: "3",
    伍: "5",
  };

  return str.replace(/[\(（]([^）\)]+)[\)）]/g, (match, p1) => {
    let converted = "";

    if (p1.length === 1 && p1 in kanjiDigits) {
      // 一桁の数字
      converted = kanjiDigits[p1];
    } else if (p1.includes("十")) {
      // 二桁の数字
      const parts = p1.split("十");
      const ten = parts[0] ? kanjiDigits[parts[0]] : "1"; // 十の前が空の場合は '1'
      const one = parts[1] ? kanjiDigits[parts[1]] : "0";
      converted = ten + one;
    } else {
      // 対応できないパターンはそのまま返す
      return match;
    }

    return "(" + converted + ")";
  });
};
