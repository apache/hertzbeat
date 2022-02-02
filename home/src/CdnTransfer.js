import useDocusaurusContext from '@docusaurus/useDocusaurusContext'

export default function transfer(imageUrl) {
    const {siteConfig} = useDocusaurusContext();
    const {cdnUrl} = siteConfig.customFields;
    if (cdnUrl !== null && imageUrl !== undefined && imageUrl !== null) {
        return cdnUrl + imageUrl;
    } else {
        return imageUrl;
    }
}