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
        path: ':collectionId',
        element: <CollectionDetails />
      }
    ]
  },
  {
    path: ':collectionId/play',
    element: <PlayLayout />,
    children: [
      {
        path: '',
        element: <FlashCard />
      }
    ]
  }
]); 