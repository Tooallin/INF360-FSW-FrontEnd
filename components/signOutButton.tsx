import { useClerk } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'
import { Text, TouchableOpacity } from 'react-native'

export const SignOutButton = () => {
  // Use `useClerk()` to access the `signOut()` function
  const { signOut } = useClerk()
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      await signOut()
      // Redirect to your desired page
      router.replace('../(auth)/signIn')
    } catch (err) {
      // See https://clerk.com/docs/custom-flows/error-handling
      // for more info on error handling
      console.error(JSON.stringify(err, null, 2))
    }
  }

  return (
    <TouchableOpacity onPress={handleSignOut} className='mt-3 bg-red-600 py-3 px-6 rounded-full flex items-center'>
      <Text className='text-white text-xl'>Cerrar sesión</Text>
    </TouchableOpacity>
  )
}