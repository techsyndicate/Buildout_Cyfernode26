<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { auth, db } from '$lib/firebase';
	import { onAuthStateChanged } from 'firebase/auth';
	import {
		deleteDoc,
		doc,
		getDoc,
		getDocs,
		collection,
		query,
		where,
		updateDoc,
		arrayUnion,
		setDoc,
		serverTimestamp
	} from 'firebase/firestore';

	let loading = $state(true);

	onMount(() => {
		const houseId = page.url.searchParams.get('houseId');

		if (!houseId) {
			loading = false;
			goto('/tenant/houses');
			return;
		}

		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (!user) {
				loading = false;
				goto('/');
				return;
			}

			try {
				const houseRef = doc(db, 'houses', houseId);
				const houseSnapshot = await getDoc(houseRef);

				if (houseSnapshot.exists()) {
					const house = houseSnapshot.data();
					const landlordId = house.ownerId;

					if (landlordId) {
						const spaceQuery = query(
							collection(db, 'tenantSpaces'),
							where('ownerId', '==', landlordId)
						);

						const spaceSnapshot = await getDocs(spaceQuery);

						if (!spaceSnapshot.empty) {
							const spaceDoc = spaceSnapshot.docs[0];
							await updateDoc(doc(db, 'tenantSpaces', spaceDoc.id), {
								members: arrayUnion(landlordId, user.uid)
							});
						} else {
							await setDoc(doc(collection(db, 'tenantSpaces')), {
								ownerId: landlordId,
								members: [landlordId, user.uid],
								createdAt: serverTimestamp()
							});
						}
					}

					const chatQuery = query(
						collection(db, 'chatrooms'),
						where('members', 'array-contains', landlordId || user.uid)
					);

					const chatSnapshot = await getDocs(chatQuery);

					if (!chatSnapshot.empty) {
						const chatDoc = chatSnapshot.docs[0];
						await updateDoc(doc(db, 'chatrooms', chatDoc.id), {
							members: arrayUnion(user.uid)
						});
					} else {
						await setDoc(doc(collection(db, 'chatrooms')), {
							code: Math.floor(100000 + Math.random() * 900000).toString(),
							members: [landlordId, user.uid],
							createdAt: serverTimestamp()
						});
					}
				}

				await deleteDoc(houseRef);
			} catch (err) {
				console.error(err);
			}

			loading = false;

			setTimeout(() => {
				goto('/tenant/houses');
			}, 1000);
		});

		return () => unsubscribe();
	});
</script>

<div class="flex min-h-screen items-center justify-center">
	<h1 class="text-2xl font-semibold">Payment successful. Redirecting...</h1>
</div>
