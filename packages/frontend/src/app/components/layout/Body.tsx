import { FC, PropsWithChildren } from 'react'

const Body: FC<PropsWithChildren> = ({ children }) => {
  return (
    <main className="flex flex-grow flex-col py-8 md:w-5/6 lg:w-3/4">
      {children}
    </main>
  )
}
export default Body
