import { Link, useLocation } from 'react-router-dom'

export default function GuestMobileAuthBar() {
  const location = useLocation()

  const hiddenPaths = ['/login', '/register', '/onboarding']

  if (hiddenPaths.some(path => location.pathname.startsWith(path))) {
    return null
  }

  return (
    <nav className="guestMobileAuthBar" aria-label="Guest mobile actions">
      <div className="guestMobileAuthText">
        <strong>Start with Rota</strong>
        <span>Create or join trusted circles</span>
      </div>

      <div className="guestMobileAuthActions">
        <Link className="guestMobileLogin" to="/login">
          Log in
        </Link>

        <Link className="guestMobileSignup" to="/register">
          Sign up
        </Link>
      </div>
    </nav>
  )
}