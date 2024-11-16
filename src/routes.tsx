import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import { CollectionDetails } from './components/CollectionDetails';
import { FlashCard } from './components/FlashCard';
import { PlayLayout } from './layouts/PlayLayout';
import { NotFound } from './components/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: 'collection/:collectionId',
        element: <CollectionDetails />
      }
    ],
    errorElement: <NotFound />
  },
  {
    path: 'collection/:collectionId/play',
    element: <PlayLayout />,
    children: [
      {
        path: '',
        element: <FlashCard />
      }
    ],
    errorElement: <NotFound />
  },
  {
    path: '*',
    element: <NotFound />
  }
]); 