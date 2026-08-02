import { NavLink } from 'react-router'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'nav-link active' : 'nav-link'

export function NavBar() {
  return (
    <nav className="nav">
      <span className="nav-title">Recipe box</span>
      <ul>
        <li>
          {/* `end` keeps "/" from matching every route */}
          <NavLink to="/" end className={linkClass}>
            Recipes
          </NavLink>
        </li>
        <li>
          <NavLink to="/shopping-list" className={linkClass}>
            Shopping list
          </NavLink>
        </li>
      </ul>
    </nav>
  )
}
