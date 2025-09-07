import MapComponent from "./components/Maps"

function App() {
  return (
    <>
      <h1 className="app-title m-2 p-4 text-4xl font-bold text-center antialiased">
        Google Places API
      </h1>
      <div className="w-100% sm:w-[40%] m-2 h-screen items-center bg-red-300">
        <MapComponent />
      </div>
    </>
  )
}

export default App