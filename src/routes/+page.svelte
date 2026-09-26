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


<div class="m-6 h-[93vh] rounded-2xl border-none bg-[url('xyz.png')] bg-cover bg-center p-8 grid grid-rows-[auto_1fr] relative">
    
    <header class="flex justify-between items-center w-full">
        <span class="text-xl font-semibold text-white">shareSpace</span>
        <nav class="flex gap-8 font-medium">
            <a href="#offices" class="text-white hover:underline">See Offices</a>
            <a href="#rent" class="text-white hover:underline">Rent Out</a>
            <a href="#contact" class="text-white hover:underline">Contact</a>
        </nav>
    </header>

    <main class="flex flex-col items-center justify-center text-center gap-10 self-center">
        <div>
            <h1 class="text-5xl font-bold text-white">shareSpace</h1>
            <p class="text-3xl text-white mt-2">Collborative Spaces, Made Easy.</p>
        </div>

        <div class="flex flex-col items-center gap-3">
            <p class="text-xl text-white">Wanna see more?</p>
            <button 
                onclick={signIn} 
                class="border-2 border-white text-white px-6 py-2 rounded-lg font-medium hover:bg-white hover:text-black transition"
            >
                Sign Up
            </button>
        </div>
    </main>
</div>