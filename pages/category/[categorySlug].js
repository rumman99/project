import Head from "next/head";
import Link from "next/link";
import { gql } from "@apollo/client";

import { getApolloClient } from "../../lib/apollo-client";
import parse from "html-react-parser";
import styles from "../../styles/Home.module.css";
import categoryStyles from './category.module.css'

const LENGTH = 100;

export default function Category({ posts, slug, categorySeo, ...props }) {

    const postExcerptShorten = (excerpt) => {
        const newExcerpt = excerpt ? `${excerpt.substring(0, LENGTH)} [...]</p>` : excerpt
        return newExcerpt
    }
    const title = slug.replace(/-/g, " ")
    const fullHead = categorySeo?.fullHead ? parse(categorySeo?.fullHead) : null;
    // return <></>
    return (
        <div className={styles.container}>
            <Head>
                {fullHead}
            </Head>

            <main className={categoryStyles.main}>
                <div className={categoryStyles.background} />
                <h1 className={styles.title}>{title.charAt(0).toUpperCase()
                    + title.slice(1)}</h1>
                <div className={categoryStyles.container}>
                    <ul className={`${styles.grid} ${categoryStyles.grid}`}>
                            {posts.length > 0 ? (
                                posts.map((post) => (
                                    <li key={post.uri} className={`${styles.card} `}>
                                        {/* ... */}
                                    </li>
                                ))
                            ) : (
                                <li>
                                    <p>Oops, no posts found!</p>
                                </li>
                            )}
                    </ul>
                </div>
            </main>
        </div>)

}


export async function getStaticProps({ params, locale, ...props }) {
    const { categorySlug } = params;
    const language = locale.toUpperCase();

    const apolloClient = getApolloClient();
    const databaseIdQuery = await apolloClient.query({
        query: gql`
        query getCatId($categorySlug: [String])
        {
            categories(where: {slug: $categorySlug}) {
                nodes {
                    databaseId
                }
            }
        }`
        ,
        variables: {
            categorySlug
        }
    });

    const databaseId = databaseIdQuery?.data?.categories?.nodes[0]?.databaseId;

    if (!databaseId) {
        return {
            notFound: true,
        };
    }

    const categoryTranslationsData = await apolloClient.query({
        query: gql`
        query getTranslationsForCategory($id: ID!, $language: LanguageCodeEnum!) 
            {
            generalSettings {
            title
            }
            category(id: $id, idType: DATABASE_ID) {
                seo {
                    fullHead
                    metaDesc
                    metaKeywords
                }
                translation(language: $language) {
                    slug
                    posts {
                        nodes {
                            slug
                            uri
                            title
                            excerpt
                        }
                    }
                }
                language {
                    code
                }
            }
        }
      `,
        variables: {
            id: databaseId,
            language,
        },
    });

    const categoryTranslations = categoryTranslationsData?.data?.category || {};
    const posts = categoryTranslations?.translation?.posts?.nodes || [];
    const site = categoryTranslationsData?.data?.generalSettings || {};

    if (categoryTranslations?.language?.code && language !== categoryTranslations.language.code) {
        return {
            redirect: {
                destination: `/category/${categoryTranslations.translation.slug}`
            },
        };
    }

    return {
        props: {
            posts,
            language,
            path: `/${categoryTranslations?.translation?.slug || ''}`,
            site,
            slug: categoryTranslations?.translation?.slug || '',
            categorySeo: categoryTranslations?.seo || null
        },
        revalidate: 10,
    };
}

export async function getStaticPaths({ locales, defaultLocale, ...props }) {
    const apolloClient = getApolloClient();

    const data = await apolloClient.query({
        query: gql`
        {
        posts(first: 10000) {
          edges {
            node {
              id
              title
              slug
            }
          }
        }
      }
      `,
        // variables: {
        //     language: defaultLocale.toUpperCase(), //language
        // }
    });

    const posts = (data?.data?.posts?.edges || []).map(({ node }) => node);

    const paths = posts.map(({ slug }) => {
        return {
            params: {
                categorySlug: slug,
            },
        };
    });

    return {
        paths: [
            ...paths,
        ],
        fallback: "blocking",
    };
}