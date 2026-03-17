import { useState, useEffect } from 'react';
import { createTLStore, defaultShapeUtils } from 'tldraw';

export const useYjsStore = (yMap) => {
    const [store] = useState(() => createTLStore({ shapeUtils: defaultShapeUtils }));
    const [storeWithStatus, setStoreWithStatus] = useState({ status: 'loading' });

    useEffect(() => {
        if (!yMap) return;

        const isSharable = (record) => {
            return ['shape', 'page', 'asset', 'binding', 'document'].includes(record?.typeName);
        };
        // 1. Initial Load (Hydration)
        const initialRecords = [];
        yMap.forEach((record) =>{ 
            if (isSharable(record)) 
                { 
                    initialRecords.push(record); 
                }
       });
        if (initialRecords.length > 0) {
            store.mergeRemoteChanges(() => {
                store.put(initialRecords);
            });
        }

        // ==========================================
        // 2. Listen to Network (User B -> User A)
        // ==========================================
        // 2. Listen to Network (User B -> User A)
        const handleYjsChange = (event,transaction) => {
            if (transaction.local) {
                return; 
            }
            const changes = [];
            const removals = [];

            // 🌟 FIX: Map loops pass (value, key). We must capture both!
            event.changes.keys.forEach((changeValue, keyString) => {
                if (changeValue.action === 'delete') {
                    removals.push(keyString);
                } else {
                    const record = yMap.get(keyString); // Now looking up the real string ID!
                    if (record && isSharable(record)) {
                        changes.push(record);
                    }
                }
            });

            if (changes.length > 0 || removals.length > 0) {
                console.log(`📥 Received from network: ${changes.length} shapes, ${removals.length} deletions`);
                store.mergeRemoteChanges(() => {
                    if (changes.length > 0) store.put(changes);
                    if (removals.length > 0) store.remove(removals);
                });
            }
        };
        yMap.observe(handleYjsChange);

        // 3. Listen to Human (User A -> User B)
        const unsub = store.listen((history) => {
            if (history.source !== 'user') return;
            if (!history.changes) return;

            Object.values(history.changes.added || {}).forEach((record) => {
                if (isSharable(record)) {
                    yMap.set(record.id, record);
                }
            });

            Object.values(history.changes.updated || {}).forEach(([_, record]) => {
               
                if (isSharable(record)) {
                    yMap.set(record.id, record);
                }
            });

            Object.values(history.changes.removed || {}).forEach((record) => {
                if (isSharable(record)){
                yMap.delete(record.id);
                }
            });
        });

        setStoreWithStatus({ store, status: 'synced-remote' });

        return () => {
            yMap.unobserve(handleYjsChange);
            unsub();
        };
    }, [yMap, store]);

    return storeWithStatus;
};