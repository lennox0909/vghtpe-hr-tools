$env:GOOS="js"
$env:GOARCH="wasm"
go build -o js/search.wasm data/search.go