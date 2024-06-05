import * as fs from "fs";
import { test, expect } from "@playwright/test";
import { zipAndDeleteFolder } from "../src/BookShelfFileSystem";
import path from "path";

test.skip("zip test", async () => {
  const source = path.resolve(
    "./images/追放された転生重騎士はゲーム知識で無双する　（2）",
  );
  const zipFile = path.resolve("./images/a.zip");
  console.log(`source: ${source}`);
  console.log(`zipFile: ${zipFile}`);
  await zipAndDeleteFolder(source, zipFile);
});
