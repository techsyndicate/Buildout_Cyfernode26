<script>
	import { auth } from '$lib/firebase';
	import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
	import { goto } from '$app/navigation';

	async function signIn() {
		const provider = new GoogleAuthProvider();

		try {
			await signInWithPopup(auth, provider);
			await goto('/home');
		} catch (error) {
			console.error(error);
		}
	}
</script>

<button onclick={signIn}> Sign in with Google </button>
