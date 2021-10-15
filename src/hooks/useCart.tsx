import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>()

  useEffect(() => {
    prevCartRef.current = cart;
  })

  const prevCart = prevCartRef.current ?? cart

  useEffect(() => {
    if(prevCart !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
    }
  }, [cart, prevCart])

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart]//carrinho
      const productExist = updatedCart.find(product => product.id === productId)//produto selecionado já existe no carrinho

      const stock = await api.get(`/stock/${productId}`)//obter o estoque do produto selecionado na api
      
      const stockAmount = stock.data.amount//quantidade em estoque do produto selecionado
      const currenteAmount = productExist ? productExist.amount : 0//quantidade de itens no estoque para o produto selecionado
      const amount = currenteAmount + 1;//quantidade desejada do produto selecionado no carrinho
      
      if(amount > stockAmount) {//sea quantidade desejada for maior que a quantidade em estoque
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(productExist) {
        productExist.amount = amount//essa altração já reflete no array updatedCart
      } else {
        const product = await api.get(`/products/${productId}`)
        const newProduct = {...product.data, amount: 1}

        updatedCart.push(newProduct)
      }
      
      setCart(updatedCart)
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart]
      const productIndex = updatedCart.findIndex(product => product.id === productId)

      if(productIndex >= 0) {
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart)
      } else {
        throw Error()
      }

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) {
        return;
      }

      const stock = await api.get<Stock>(`/stock/${productId}`)
      const stockAmount = stock.data.amount

      if(amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart]

      const productExist = updatedCart.find(product => product.id === productId)
      
      if(productExist) {
        productExist.amount = amount

        setCart(updatedCart)
      } else {
        throw Error()
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
