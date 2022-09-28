
# INSTALL
```shell
$ npm install
```

# SETUP
ダウンロードしたい本棚のヤフーログインアカウントを設定する。<br>

```shell
$ vim 
...

// TODO: 自分のヤフーアカウントを入力
// ヤフーアカウント
const yahooAccount = '';

// パスワード
const password = '';

...
```
※ 事前に、SMS認証なし、ワンタイムなし 、パスワードのみでログインできるように設定しておく必要がある。<br>
https://support.yahoo-net.jp/PccLogin/s/article/H000004633

# EXECUTE
```shell
npm run test ./tests/bookshelf.spec.ts
```