import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import { CollectionDetails } from './components/CollectionDetails';
import { FlashCard } from './components/FlashCard';
import { PlayLayout } from './layouts/PlayLayout';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: 'collection/:collectionId',
        element: <CollectionDetails />
      }
    ]
  },
  {
    path: 'collection/:collectionId/play',
    element: <PlayLayout />,
    children: [
      {
        path: '',
        element: <FlashCard />
      }
    ]
  }
]); 