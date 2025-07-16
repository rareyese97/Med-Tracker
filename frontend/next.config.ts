/** @type {import('next').NextConfig} */
const nextConfig = {
	// …your existing config…

	eslint: {
		// Warning: only do this if you really want to ignore all lint errors!
		ignoreDuringBuilds: true,
	},
};

module.exports = nextConfig;
