import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import RecipeVideoGenerator from '../../components/video/RecipeVideoGenerator';

export default function RecipeSEOPage({ id }) {
  const [recipe, setRecipe] = useState(null);

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then(res => res.json())
      .then(data => setRecipe(data));
  }, [id]);

  if (!recipe) return <div>Loading...</div>;

  return (
    <>
      <Head>
        <title>{recipe.title} | CyberChef</title>
        <meta name="description" content={recipe.description} />
        <meta property="og:title" content={recipe.title} />
        <meta property="og:description" content={recipe.description} />
        <meta property="og:image" content={recipe.imageUrl} />
        <link rel="canonical" href={`https://cyberchef.ai/recipes/${id}`} />
      </Head>
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">{recipe.title}</h1>
        <img src={recipe.imageUrl} alt={recipe.title} className="mb-4 rounded" />
        <div>{recipe.description}</div>
        <div className="mt-4">
          <a href={`https://cyberchef.ai/recipes/${id}`} className="text-blue-600 underline">Share this recipe</a>
        </div>
        <RecipeVideoGenerator recipeId={id} />
      </div>
    </>
  );
}

// For Next.js dynamic routing
RecipeSEOPage.getInitialProps = ({ query }) => {
  return { id: query.id };
};
