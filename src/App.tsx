import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import {
  loadRecipes,
  loadShoppingList,
  saveRecipes,
  saveShoppingList,
} from './api'
import { NavBar } from './components/NavBar'
import { uniqueSorted } from './items'
import { RecipesPage } from './pages/RecipesPage'
import { ShoppingListPage } from './pages/ShoppingListPage'
import type { Recipe, ShoppingItem } from './types'
import './App.css'

function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([])
  const [status, setStatus] = useState('Loading…')

  useEffect(() => {
    Promise.all([loadRecipes(), loadShoppingList()])
      .then(([loadedRecipes, loadedList]) => {
        setRecipes(loadedRecipes)
        setShoppingList(loadedList)
        setStatus('')
      })
      .catch((err: Error) => setStatus(err.message))
  }, [])

  /** Every mutation goes through here, so each one writes the file once. */
  function persist(next: Recipe[]) {
    setRecipes(next)
    saveRecipes(next).catch((err: Error) => setStatus(err.message))
  }

  function persistShoppingList(next: ShoppingItem[]) {
    setShoppingList(next)
    saveShoppingList(next).catch((err: Error) => setStatus(err.message))
  }

  // One shared vocabulary across both pages, so names and units stay consistent.
  const allItems = [...recipes.flatMap((r) => r.ingredients), ...shoppingList]
  const nameSuggestions = uniqueSorted(allItems.map((i) => i.name))
  const unitSuggestions = uniqueSorted(allItems.map((i) => i.unit))

  return (
    <>
      <NavBar />
      <main className="app">
        {/* Load and save errors are global, so they show on either page. */}
        {status && <p className="status">{status}</p>}

        <Routes>
          <Route
            path="/"
            element={
              <RecipesPage
                recipes={recipes}
                onChange={persist}
                shoppingList={shoppingList}
                onShoppingListChange={persistShoppingList}
                nameSuggestions={nameSuggestions}
                unitSuggestions={unitSuggestions}
              />
            }
          />
          <Route
            path="/shopping-list"
            element={
              <ShoppingListPage
                shopping_list={shoppingList}
                onChange={persistShoppingList}
                nameSuggestions={nameSuggestions}
                unitSuggestions={unitSuggestions}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  )
}

export default App
