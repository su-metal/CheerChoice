# CheerChoice

## Troubleshooting

### EAS Build: `tar ... Permission denied` で失敗する場合

症状:
- `tar: assets/...: Cannot open: Permission denied`
- `tar: src/...: Cannot mkdir: Permission denied`
- `tar -C /home/expo/workingdir/build ... exited with non-zero code: 2`

原因:
- Windows で `assets` / `src` / `docs` などのディレクトリに `ReadOnly` 属性 (`R`) が付いたまま EAS に送られ、展開先で書き込み失敗することがある。

対処:
```powershell
attrib -R assets /S /D
attrib -R src /S /D
attrib -R docs /S /D
eas build --profile development --platform android --clear-cache
```

確認:
```powershell
attrib assets
attrib src
attrib docs
```
`R` が表示されなければOK。
