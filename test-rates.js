async function test() {
  const res = await fetch("https://open.er-api.com/v6/latest/USD")
  const data = await res.json()
  console.log(data.rates.INR, data.rates.EUR)
}
test()
