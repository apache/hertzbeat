const fs = require("fs");
const https = require("https");

const teamSrc = "src/pages/team/data/member.json";
const allContributorSrc = "../.all-contributorsrc";
const avatarFile = "src/pages/team/data/github_avatar.json";
const avatarSize = 100;
const allContributorFile = "src/pages/team/data/allContributor.json";

/**
 * Generates a random delay between min and max milliseconds
 * @param {number} min - Minimum delay in milliseconds
 * @param {number} max - Maximum delay in milliseconds
 * @returns {number} Random delay in milliseconds
 */
function getRandomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Fetches avatar image from GitHub and converts it to base64
 * @param {string} githubId - GitHub ID
 * @returns {Promise<string>} Base64 encoded avatar image
 */
function fetchAvatarAsBase64(githubId) {
    return new Promise((resolve, reject) => {
        const avatarUrl = `https://avatars.githubusercontent.com/u/${githubId}?v=4&s=${avatarSize}`;

        https
            .get(avatarUrl, (response) => {
                // Check if request was successful
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to fetch avatar from ${avatarUrl}: ${response.statusCode}`));
                    return;
                }

                const chunks = [];

                // Collect data chunks
                response.on("data", (chunk) => {
                    chunks.push(chunk);
                });

                // Convert to base64 when complete
                response.on("end", () => {
                    const buffer = Buffer.concat(chunks);
                    const base64 = buffer.toString("base64");
                    resolve(base64);
                });
            })
            .setTimeout(10000, () => {
                reject(new Error(`Failed to fetch avatar ${avatarUrl}: timed out`));
            })
            .on("error", (error) => {
                reject(error);
            });
    });
}

/**
 * Extracts GitHub user ID from GitHub avatar URL
 * @param {string} url - The GitHub avatar URL to parse
 * @returns {string|null} - The extracted user ID or null if extraction fails
 */
function extractGitHubId(url) {
    try {
        // Validate if it's a valid GitHub avatar URL
        if (!url.includes("avatars.githubusercontent.com/u/")) {
            throw new Error("Not a valid GitHub avatar URL");
        }

        // Use regular expression to extract user ID
        const regex = /avatars\.githubusercontent\.com\/u\/(\d+)/;
        const match = url.match(regex);

        if (match && match[1]) {
            return match[1];
        }
        return null;
    } catch (error) {
        console.error("Error:", error.message);
        return null;
    }
}

/**
 * Processes a list of githubIds and adds avatar_base64 property
 * @param {Array} ids - Array of id
 * @returns {Promise<Array>} Array of avatar_base64
 */
async function processAvatars(ids) {
    const processedArray = [];

    for (let i = 0; i < ids.length; i++) {
        const _id = ids[i];

        try {
            console.log(`-- Fetching avatar for ${_id} ... [${i + 1}/${ids.length}]`);

            // Fetch avatar and convert to base64
            const avatarBase64 = await fetchAvatarAsBase64(_id);

            processedArray.push({
                id: _id,
                avatar_base64: avatarBase64
            });
            console.log(`✓ Successfully processed ${_id}`);
        } catch (error) {
            console.error(`✗ Error processing ${_id}: ${error.message}`);
        }

        // Add random delay between 100-2000 millisecond before next request (except for the last member)
        if (i < ids.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, getRandomDelay(100, 2000)));
        }
    }
    return processedArray;
}

/**
 * Main function
 */
async function main() {
    try {
        const uniqueGithubIdsSet = new Set();

        // 1. Read and parse team
        console.log(`==> Reading ${teamSrc} file`);
        const teamSrcData = JSON.parse(fs.readFileSync(teamSrc, "utf8"));

        // PMC
        (teamSrcData.pmc || []).forEach((d) => {
            if (d.githubId) {
                uniqueGithubIdsSet.add(d.githubId);
            }
        });

        // Committer
        (teamSrcData.committer || []).forEach((d) => {
            if (d.githubId) {
                uniqueGithubIdsSet.add(d.githubId);
            }
        });

        // 2. Read and parse all contributor
        console.log(`\n==> Reading ${allContributorSrc} file`);
        const allContributorSrcData = JSON.parse(fs.readFileSync(allContributorSrc, "utf8"));
        const allContributorData = [];
        (allContributorSrcData.contributors || []).forEach((d) => {
            if (d.avatar_url) {
                const extractId = extractGitHubId(d.avatar_url);
                if (extractId) {
                    uniqueGithubIdsSet.add(extractId);
                    allContributorData.push({
                        ...d,
                        githubId: extractId
                    });
                }
            }
        });

        const uniqueGithubArray = Array.from(uniqueGithubIdsSet);

        console.log("\n==> Processing avatars");
        const avatarsArray = await processAvatars(uniqueGithubArray);

        // 3. Write files
        console.log(`\n==> Writing ${avatarFile} file`);
        fs.writeFileSync(avatarFile, JSON.stringify(avatarsArray, null, 2));
        fs.writeFileSync(allContributorFile, JSON.stringify(allContributorData, null, 2));

        console.log("\n✓ Done!");
    } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
    }
}

main();