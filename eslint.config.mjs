import nextVitals from "eslint-config-next/core-web-vitals"

const config = [
	{
		ignores: ["landing-edits/**", "_archive/**"],
	},
	...nextVitals,
]

export default config
