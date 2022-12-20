
# INSTALL
```shell
$ npm install
```

# SETUP
ダウンロードしたい本棚のヤフーログインアカウントを設定する。<br>
自分のヤフーIDとパスワードを入力して.envファイルを作る
```shell
$ vim .env
YAHOO_ID=""
YAHOO_PASS=""
```
※ 事前に、SMS認証なし、ワンタイムなし 、パスワードのみでログインできるように設定しておく必要がある。<br>
https://support.yahoo-net.jp/PccLogin/s/article/H000004633

# EXECUTE
```shell
npm run test ./tests/bookshelf.spec.ts
```